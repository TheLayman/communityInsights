import { ChatPrompt } from "@microsoft/teams.ai";
import { myModel } from "./modelInstance";
import fs from "fs";
import path from "path";

// Load few-shot prompt template for extraction
const templatePath = path.resolve(__dirname, "prompts/extractor.txt");
const instructions = fs.readFileSync(templatePath, "utf-8");

// Prompt to extract structured insights from raw text
const extractorPrompt = new ChatPrompt({
  instructions,
  model: myModel,
});

/**
 * Calls the LLM to extract the insight structure from a raw text block.
 * @param text - The raw StackOverflow question or GitHub issue body
 * @returns An object with { category, summary, severity }
 */
export async function extractInsights(text: string) {
  const result = await extractorPrompt.send(text);
  // LLM returns the JSON as the first content item which may be wrapped in
  // code fences or other text. Normalise it to a raw string first.
  console.log(result);
  const content = result.content;
  const raw =
    typeof content === "string"
      ? content
      : typeof content === "object" && "text" in content
        ? content.text
        : "";

  // Try to locate a JSON object inside the response and parse it. This is more
  // tolerant of minor formatting variations like ```json fences.
  const match = raw.trim().match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error(`Unable to parse JSON from: ${raw}`);
  }

  return JSON.parse(match[0]) as {
    category: string;
    summary: string;
    severity: string;
  };
}
