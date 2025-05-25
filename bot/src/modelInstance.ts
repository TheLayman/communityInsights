// src/modelInstance.ts
import "dotenv/config";
import { OpenAIChatModel } from '@microsoft/teams.openai'; 
export const myModel = new OpenAIChatModel({
    timeout: 15000,
    apiKey: process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION,
    model: process.env.AZURE_OPENAI_MODEL_DEPLOYMENT_NAME!,
  });