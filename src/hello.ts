import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: process.env.MIMOE_BASE_URL,
  apiKey: process.env.MIMOE_API_KEY,
});

const response = await client.chat.completions.create({
  model: process.env.MIMOE_MODEL!,
  messages: [
    {
      role: "user",
      content: "Say hello in one short sentence.",
    },
  ],
});

const answer = response.choices[0].message.content ?? "";
console.log(answer.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim());
