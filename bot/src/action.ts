import { ChatPrompt } from "@microsoft/teams.ai";
import fs from "fs";
import path from "path";
import { myModel } from "./modelInstance";

const templatePath = path.resolve(__dirname, "prompts/action.txt");
const instructions = fs.readFileSync(templatePath, "utf-8");

const actionPrompt = new ChatPrompt({
  instructions,
  model: myModel,
});

export async function generateActions(items: { summary: string; severity: string; ageDays: number }[]) {
  const list = items
    .map((i, idx) => `${idx + 1}. ${i.summary} (${i.severity}, age ${i.ageDays})`)
    .join("\n");
  const result = await actionPrompt.send(list);
  const content = result.content;
  const raw =
    typeof content === "string"
      ? content
      : typeof content === "object" && "text" in content
        ? content.text
        : "";
  return raw.trim();
}
