import { App } from "@microsoft/teams.apps";
import { DevtoolsPlugin } from "@microsoft/teams.dev";
import { McpPlugin } from "@microsoft/teams.mcp";
import { z } from "zod";
import { fetchStackPosts } from "./collector/stack";
import { fetchGitHubIssues } from "./collector/github"; // Adjust the import path as needed

const mcpServerPlugin = new McpPlugin({
  name:        "test-mcp",
  description: "Allows you to test the mcp server",
  // Make sure the inspector URL does not point to the same port as the MCP plugin to avoid recursion.
  inspector:   "http://localhost:6274/?transport=streamable-http&serverUrl=http://localhost:3000/mcp", // Remove ?proxyPort=3000 to avoid recursion
  transport:   { type: "sse", path: "/mcp" }, // Add required 'type' property
})
.tool(
  "echo",
  "echos back whatever you said",
  { input: z.string().describe("the text to echo back") },
  // Add explicit type for input
  async ({ input }: { input: string }) => ({
    content: [{ type: "text", text: `georgie said ${input}` }],
  }),
  // Add the required fifth argument: options (can be empty object if not needed)
  {}
);

import { z } from "zod";
import { fetchGitHubIssues } from "./collector/github";
import { fetchStackPosts } from "./collector/stack";

mcpServerPlugin.tool(
  "collectInsights",
  "Fetch latest SO & GH posts",
  z.object({}),               // no args
  async () => {
    const items = [
      ...await fetchGitHubIssues(),
      ...await fetchStackPosts(),
    ];
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(items),
        },
      ],
    };
  }
);

const app = new App({
  plugins: [
    new DevtoolsPlugin(),
    mcpServerPlugin,
  ],
});

app.start();
