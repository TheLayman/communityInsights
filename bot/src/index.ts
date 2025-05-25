import { App } from "@microsoft/teams.apps";
import { DevtoolsPlugin } from "@microsoft/teams.dev";
import { McpPlugin } from "@microsoft/teams.mcp";
import { fetchStackPosts } from "./collector/stack";
import { fetchGitHubIssues } from "./collector/github";
import { extractInsights } from "./extractor";
import { z } from "zod";

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
    "collectInsights",
    "Fetch latest SO & GH posts",
    z.object({}),
    async () => {
      const items = [
        ...(await fetchGitHubIssues()),
        ...(await fetchStackPosts()),
      ];
      return {
        content: [{ type: "text", text: JSON.stringify(items) }],
      };
    },
    {}
  );

const app = new App({
  plugins: [new DevtoolsPlugin(), mcpServerPlugin],
});

// Simple message handler that returns extracted insights as an Adaptive Card
app.on("message", async ({ context, activity }) => {
  const text = activity.text?.toLowerCase() ?? "";
  if (!text.startsWith("insights")) {
    await context.sendActivity("Send 'insights' to fetch community feedback.");
    return;
  }

  const posts = [
    ...(await fetchGitHubIssues()),
    ...(await fetchStackPosts()),
  ];

  const insights = [] as Array<any>;
  for (const post of posts) {
    const insight = await extractInsights(post.text);
    insights.push({ ...post, ...insight });
  }

  const card = {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: insights.map((i) => ({
      type: "TextBlock",
      text: `**${i.source}** [link](${i.url})\nCategory: ${i.category}\nSeverity: ${i.severity}\n${i.summary}`,
      wrap: true,
    })),
  };

  await context.sendActivity({
    attachments: [
      { contentType: "application/vnd.microsoft.card.adaptive", content: card },
    ],
  });
});

app.start();
