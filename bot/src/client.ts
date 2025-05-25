import "dotenv/config";
import { ChatPrompt } from "@microsoft/teams.ai";
import { McpClientPlugin } from "@microsoft/teams.mcpclient";
import { fetchGitHubIssues } from "./collector/github";
import { fetchStackPosts } from "./collector/stack";
import { myModel } from "./modelInstance";

/**
 * Shared prompt used by the feedback client to forward items
 * to the server's `ingestFeedback` tool.
 */
const mcpUrl = process.env.MCP_SERVER_URL || "http://localhost:3000/mcp";
const clientPrompt = new ChatPrompt(
  {
    instructions: "Forward community posts to the ingestFeedback tool.",
    model: myModel,
  },
  [new McpClientPlugin()]
).usePlugin("mcpClient", { url: mcpUrl });

export async function runClient() {
  const items = [
    ...(await fetchGitHubIssues()),
    ...(await fetchStackPosts()),
  ];
  const command = `ingestFeedback(${JSON.stringify({ items })})`;
  await clientPrompt.send(`Please execute ${command}`);
  console.log(`Sent ${items.length} items via MCP client.`);
}

export function startClientPolling(intervalMs = 5 * 60 * 1000) {
  runClient();
  setInterval(runClient, intervalMs);
}

if (require.main === module) {
  startClientPolling();
}
