import { ChatPrompt } from "@microsoft/teams.ai";
import { myModel } from "./modelInstance";

// Prompt to extract structured insights from raw text
const extractorPrompt = new ChatPrompt({
  instructions: `
You receive a block of text (a StackOverflow question or GitHub issue).
Extract and return a JSON object with exactly these keys:
  • category (one word)
  • summary (a one-sentence pain-point description)
  • severity (Low, Medium, or High)
Respond *only* with the JSON.`,
  model: myModel,
});

/**
 * Calls the LLM to extract the insight structure from a raw text block.
 * @param text - The raw StackOverflow question or GitHub issue body
 * @returns An object with { category, summary, severity }
 */
export async function extractInsights(text: string) {
  const result = await extractorPrompt.send(text);
  // LLM returns the JSON as the first content item
  const content = result.content[0];
  let jsonString: string;

  if (typeof content === "string") {
    jsonString = content;
  } else if (typeof content === "object" && "text" in content) {
    jsonString = content.text;
  } else {
    throw new Error("Unexpected extractor response format");
  }

  // Parse and return the JSON
  return JSON.parse(jsonString) as {
    category: string;
    summary: string;
    severity: string;
  };
}
