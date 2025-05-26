import { App } from "@microsoft/teams.apps";
import { DevtoolsPlugin } from "@microsoft/teams.dev";
import { McpPlugin } from "@microsoft/teams.mcp";
import { extractInsights } from "./extractor";
import { generateActions } from "./action";
import { z } from "zod";

// Store processed insights so repeated "insights" requests don't
// trigger new LLM calls unless there's new data.
const processedIds = new Set<string>();
const processingQueue: any[] = [];
const insightsCache = new Map<string, any>();
let processingPromise: Promise<void> | null = null;

async function processQueue() {
  if (processingPromise) {
    return processingPromise;
  }

  processingPromise = (async () => {
    while (processingQueue.length > 0) {
      const post = processingQueue.shift()!;
      const insight = await extractInsights(post.text);
      const created = new Date(post.createdAt);
      const ageDays = Math.floor((Date.now() - created.getTime()) / 86400000);
      const entry = { ...post, ...insight, ageDays };
      const key = insight.summary.toLowerCase();
      if (!insightsCache.has(key)) {
        insightsCache.set(key, entry);
      }
    }
  })().finally(() => {
    processingPromise = null;
  });

  return processingPromise;
}

// Create MCP server plugin with a simple echo and data collection tool

const mcpServerPlugin = new McpPlugin({
  name: "community-insights",
  description: "MCP server for collecting community feedback",
  inspector: "http://localhost:6274/?transport=streamable-http&serverUrl=http://localhost:3000/mcp",
  transport: { type: "sse", path: "/mcp" },
})
  .tool(
    "echo",
    "Echos back whatever you say",
    { input: z.string().describe("text to echo back") },
    async ({ input }: { input: string }) => ({
      content: [{ type: "text", text: input }],
    }),
    {}
  )
  .tool(
    "ingestFeedback",
    "Store feedback items provided by the MCP client",
    {
      items: z
        .array(
          z.object({
            id: z.string(),
            source: z.string(),
            url: z.string(),
            text: z.string(),
            createdAt: z.string(),
          })
        )
        .describe("feedback items"),
    },
    async ({ items }: { items: any[] }) => {
      for (const item of items) {
        if (!processedIds.has(item.id)) {
          processedIds.add(item.id);
          processingQueue.push(item);
        }
      }
      processQueue();
      return { content: [{ type: "text", text: "ok" }] };
    },
    {}
  );

const app = new App({
  plugins: [new DevtoolsPlugin(), mcpServerPlugin],
});

function severityColor(sev: string) {
  switch (sev.toLowerCase()) {
    case "high":
      return "Attention";
    case "medium":
      return "Warning";
    case "low":
      return "Good";
    default:
      return "Default";
  }
}

function createInsightCard(i: any) {
  return {
    contentType: "application/vnd.microsoft.card.adaptive",
    content: {
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      type: "AdaptiveCard",
      version: "1.5",
      body: [
        {
          type: "TextBlock",
          text: i.summary,
          wrap: true,
          weight: "Bolder",
          size: "Medium",
        },
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "stretch",
              items: [
                { type: "TextBlock", text: "Category", weight: "Bolder", isSubtle: true, spacing: "None" },
                { type: "TextBlock", text: i.category, wrap: true },
              ],
            },
            {
              type: "Column",
              width: "auto",
              items: [
                { type: "TextBlock", text: "Severity", weight: "Bolder", isSubtle: true, spacing: "None" },
                {
                  type: "TextBlock",
                  text: i.severity,
                  color: severityColor(i.severity) as any,
                  weight: "Bolder",
                },
              ],
            },
            {
              type: "Column",
              width: "auto",
              items: [
                { type: "TextBlock", text: "Age", weight: "Bolder", isSubtle: true, spacing: "None" },
                { type: "TextBlock", text: `${i.ageDays} days` },
              ],
            },
          ],
        },
        { type: "TextBlock", text: `Source: ${i.source}`, isSubtle: true, wrap: true },
      ],
      actions: [
        {
          type: "Action.OpenUrl",
          title: "View Details",
          url: i.url,
        },
      ],
    },
  };
}

function createActionCard(actionText: string) {
  const lines = actionText.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const body: any[] = [
    { type: "TextBlock", text: "Recommended Actions", weight: "Bolder", size: "Medium" },
  ];
  for (const line of lines) {
    body.push({ type: "TextBlock", text: line, wrap: true, spacing: "Small" });
  }
  return {
    contentType: "application/vnd.microsoft.card.adaptive",
    content: {
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      type: "AdaptiveCard",
      version: "1.5",
      body,
    },
  };
}

// Simple message handler that returns extracted insights as an Adaptive Card
app.on("message", async ({ context, stream, activity }) => {
  const send = (msg: any) => {
    const activityMsg =
      typeof msg === "string" ? { type: "message", text: msg } : { type: "message", ...msg };
    if (context?.sendActivity) {
      return context.sendActivity(activityMsg);
    }
    return stream.emit(activityMsg);
  };

  const text = activity.text?.trim().toLowerCase() ?? "";
  if (!text.startsWith("insights") && !text.startsWith("action")) {
    await send("Send 'insights' or 'action' to fetch community feedback.");
    return;
  }

  // Ensure any queued feedback items have been processed.
  processQueue();
  if (processingPromise) {
    await processingPromise;
  }

  if (insightsCache.size === 0) {
    await send("No feedback available. Run the client to ingest posts.");
    return;
  }

  const insights = Array.from(insightsCache.values());

  if (text.startsWith("action")) {
    const actionText = await generateActions(
      insights.map((i) => ({ summary: i.summary, severity: i.severity, ageDays: i.ageDays }))
    );
    await send({ attachments: [createActionCard(actionText)] });
    return;
  }

  const severityOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
  insights.sort((a, b) => {
    const sevDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
    if (sevDiff !== 0) {
      return sevDiff;
    }
    return a.ageDays - b.ageDays;
  });

  for (const i of insights) {
    await send({ attachments: [createInsightCard(i)] });
  }
});

app.start();
