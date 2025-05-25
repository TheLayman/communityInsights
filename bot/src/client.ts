import "dotenv/config";
import { ChatPrompt } from "@microsoft/teams.ai";
import { McpClientPlugin } from "@microsoft/teams.mcpclient";
import { fetchGitHubIssues } from "./collector/github";
import { fetchStackPosts } from "./collector/stack";
import { myModel } from "./modelInstance";

const mcpUrl = process.env.MCP_SERVER_URL || "http://localhost:3000/mcp";

const clientPrompt = new ChatPrompt(
  {
    instructions: "Forward community posts to the ingestFeedback tool.",
    model: myModel,
  },
  [new McpClientPlugin()]
).usePlugin("mcpClient", { url: mcpUrl });

(async () => {
  const items = [
    ...(await fetchGitHubIssues()),
    ...(await fetchStackPosts()),
  ];

  const command = `ingestFeedback(${JSON.stringify({ items })})`;
  await clientPrompt.send(`Please execute ${command}`);
  console.log(`Sent ${items.length} items via MCP client.`);
})();
