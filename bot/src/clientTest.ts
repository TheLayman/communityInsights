import "dotenv/config";
import { ChatPrompt } from "@microsoft/teams.ai";
import { McpClientPlugin } from "@microsoft/teams.mcpclient";
import { myModel } from "./modelInstance";          // ← whatever file holds your connected model

const prompt = new ChatPrompt(
  {
    instructions: "You are a tester. ALWAYS use tool calls.",
    model: myModel,          // 🔑 unchanged – keeps your keys/params intact
  },
  [new McpClientPlugin()]     // no logger object needed
).usePlugin("mcpClient", { url: "http://localhost:3000/mcp" });

(async () => {
  const res = await prompt.send('Use echo("hello from client!")');
  console.log(JSON.stringify(res, null, 2));
})();
