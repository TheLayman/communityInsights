import "dotenv/config";
import { ChatPrompt } from "@microsoft/teams.ai";
import { McpClientPlugin } from "@microsoft/teams.mcpclient";
import { fetchGitHubIssues } from "./collector/github";
import { fetchStackPosts } from "./collector/stack";
import { loadCache, saveCache } from "./cache";
import { myModel } from "./modelInstance";

const mcpUrl = process.env.MCP_SERVER_URL || "http://localhost:3000/mcp";

// Track previously ingested post IDs to avoid resending them
const ingestedIds = loadCache();

async function createPrompt() {
  try {
    console.log(`Connecting to MCP server at ${mcpUrl}`);
    // Creating the prompt loads the MCP schema. If the server is unreachable
    // the plugin will throw which we catch below.
    const prompt = new ChatPrompt(
      {
        instructions: "Forward community posts to the ingestFeedback tool.",
        model: myModel,
      },
      [new McpClientPlugin()]
    ).usePlugin("mcpClient", { url: mcpUrl });

    console.log(`Successfully connected to MCP server at ${mcpUrl}`);
    return prompt;
  } catch {
    console.error(`Could not load MCP schema; is the server running at ${mcpUrl}?`);
    process.exit(1);
  }
}

async function runClient(prompt: ChatPrompt) {
  const items = [
    ...(await fetchGitHubIssues()),
    ...(await fetchStackPosts()),
  ];

  console.log(`Fetched ${items.length} items from sources`);

  const newItems = items.filter((i) => !ingestedIds.has(i.id));

  if (newItems.length === 0) {
    console.log("No new posts found");
    return;
  } else {
    console.log(`Found ${newItems.length} new posts`);
  }
  const command = `ingestFeedback(${JSON.stringify({ items: newItems })})`;
  await prompt.send(`Please execute ${command}`);
  console.log(`Sent ${newItems.length} items via MCP client.`);
  newItems.forEach((i) => ingestedIds.add(i.id));
  saveCache(ingestedIds);
}

(async () => {
  const clientPrompt = await createPrompt();
  await runClient(clientPrompt);
  setInterval(() => runClient(clientPrompt), 5 * 60 * 1000);
})();
