import "dotenv/config";
import { ChatPrompt } from "@microsoft/teams.ai";
import { McpClientPlugin } from "@microsoft/teams.mcpclient";
import axios from "axios";
import { fetchGitHubIssues } from "./collector/github";
import { fetchStackPosts } from "./collector/stack";
import { myModel } from "./modelInstance";

const mcpUrl = process.env.MCP_SERVER_URL || "http://localhost:3000/mcp";

async function createPrompt() {
  try {
    await axios.get(mcpUrl);
  } catch {
    console.error(`Unable to reach MCP server at ${mcpUrl}. Is the server running?`);
    process.exit(1);
  }

  try {
    return new ChatPrompt(
      {
        instructions: "Forward community posts to the ingestFeedback tool.",
        model: myModel,
      },
      [new McpClientPlugin()]
    ).usePlugin("mcpClient", { url: mcpUrl });
  } catch {
    console.warn(`Could not load MCP schema; is the server running at ${mcpUrl}?`);
    process.exit(1);
  }
}

async function runClient(prompt: ChatPrompt) {
  const items = [
    ...(await fetchGitHubIssues()),
    ...(await fetchStackPosts()),
  ];

  if (items.length === 0) {
    console.log("No new posts found");
    return;
  }

  const command = `ingestFeedback(${JSON.stringify({ items })})`;
  await prompt.send(`Please execute ${command}`);
  console.log(`Sent ${items.length} items via MCP client.`);
}

(async () => {
  const clientPrompt = await createPrompt();
  await runClient(clientPrompt);
  setInterval(() => runClient(clientPrompt), 5 * 60 * 1000);
})();
