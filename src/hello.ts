import "dotenv/config";
import OpenAI from "openai";
import { loadConfig } from "./config.ts";

const { baseURL, apiKey, model } = loadConfig();

const client = new OpenAI({
  baseURL,
  apiKey,
});

try {
  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "user",
        content: "Say hello in one short sentence.",
      },
    ],
  });

  const answer = response.choices[0].message.content ?? "";
  console.log(answer.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim());
} catch (error) {
  console.error("Error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}
