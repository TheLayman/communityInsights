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
    await send(actionText);
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
    const attachment = {
      contentType: "application/vnd.microsoft.card.adaptive",
      content: {
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        type: "AdaptiveCard",
        version: "1.5",
        body: [
          {
            type: "Container",
            style: "emphasis",
            items: [
              {
                type: "TextBlock",
                text: i.summary,
                wrap: true,
                weight: "Bolder",
                size: "Medium",
              },
              {
                type: "FactSet",
                facts: [
                  { title: "Category: ", value: i.category },
                  { title: "Severity: ", value: i.severity },
                  { title: "Age: ", value: `${i.ageDays} days` },
                  { title: "Source: ", value: i.source },
                ],
              },
            ],
          },
        ],
        actions: [
          {
            type: "Action.OpenUrl",
            title: "View Issue",
            url: i.url,
          },
        ],
      },
    };
    await send({ attachments: [attachment] });
  }
});

app.start();
