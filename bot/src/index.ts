import { App } from "@microsoft/teams.apps";
import { DevtoolsPlugin } from "@microsoft/teams.dev";
import { McpPlugin } from "@microsoft/teams.mcp";
import { extractInsights } from "./extractor";
import { startClientPolling } from "./client";
import { z } from "zod";

// Create MCP server plugin with a simple echo and data collection tool
const feedbackItems: any[] = [];

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
    z.object({
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
    }),
    async ({ items }: { items: any[] }) => {
      feedbackItems.push(...items);
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
    if (context?.sendActivity) {
      return context.sendActivity(msg);
    }
    const activity =
      typeof msg === "string" ? { type: "message", text: msg } : msg;
    return stream.emit(activity);
  };

  const text = activity.text?.toLowerCase() ?? "";
  if (!text.startsWith("insights")) {
    await send("Send 'insights' to fetch community feedback.");
    return;
  }

  const posts = feedbackItems.splice(0, feedbackItems.length);
  if (posts.length === 0) {
    await send("No feedback available. Run the client to ingest posts.");
    return;
  }

  const deduped = new Map<string, any>();

  for (const post of posts) {
    const insight = await extractInsights(post.text);
    const created = new Date(post.createdAt);
    const ageDays = Math.floor((Date.now() - created.getTime()) / 86400000);
    const entry = { ...post, ...insight, ageDays };
    const key = insight.summary.toLowerCase();
    if (!deduped.has(key)) {
      deduped.set(key, entry);
    }
  }

  const insights = Array.from(deduped.values());
  console.log("Extracted insights:", insights);

  const attachments = insights.map((i) => ({
    contentType: "application/vnd.microsoft.card.adaptive",
    content: {
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      type: "AdaptiveCard",
      version: "1.5",
      body: [
        { type: "TextBlock", text: `Category: ${i.category}` },
        { type: "TextBlock", text: `Summary: ${i.summary}`, wrap: true },
        { type: "TextBlock", text: `Severity: ${i.severity}` },
        { type: "TextBlock", text: `Age: ${i.ageDays} days` },
        { type: "TextBlock", text: `[View](${i.url})` },
      ],
    },
  }));

  await send({ attachments });
});

app.start();

// Start the feedback client on an interval when running in dev mode
startClientPolling();
