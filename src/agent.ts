import "dotenv/config";
import OpenAI from "openai";
import { loadConfig } from "./config.ts";

const { baseURL, apiKey, model } = loadConfig();

const client = new OpenAI({
  baseURL,
  apiKey,
});

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "calculate",
      description: "Perform a basic arithmetic calculation.",
      parameters: {
        type: "object",
        properties: {
          operation: {
            type: "string",
            enum: ["add", "subtract", "multiply", "divide"],
          },
          a: {
            type: "number",
          },
          b: {
            type: "number",
          },
        },
        required: ["operation", "a", "b"],
        additionalProperties: false,
      },
    },
  },
];

const calculate = (operation: string, a: number, b: number): number => {
  switch (operation) {
    case "add":
      return a + b;
    case "subtract":
      return a - b;
    case "multiply":
      return a * b;
    case "divide":
      if (b === 0) {
        throw new Error("Division by zero is not allowed.");
      }
      return a / b;
    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }
};

type CalculationArgs = {
  operation: "add" | "subtract" | "multiply" | "divide";
  a: number;
  b: number;
};

const parseCalculationArgs = (input: string): CalculationArgs => {
  const parsed: unknown = JSON.parse(input);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid calculate arguments: expected an object.");
  }

  const { operation, a, b } = parsed as Record<string, unknown>;

  if (
    (operation !== "add" &&
      operation !== "subtract" &&
      operation !== "multiply" &&
      operation !== "divide") ||
    typeof a !== "number" ||
    !Number.isFinite(a) ||
    typeof b !== "number" ||
    !Number.isFinite(b)
  ) {
    throw new Error("Invalid calculate arguments: expected an operation and two finite numbers.");
  }

  return { operation, a, b };
};

const plainFactor = (value: string): string => (/[+\-*/]/.test(value) ? `(${value})` : value);

const formatAnswer = (content: string | null): string => {
  if (!content) {
    return "";
  }

  return content
    .replace(/<think>[\s\S]*?<\/think>\s*/g, "")
    .replace(/\\(?:times|cdot)/g, "*")
    .replace(
      /\\frac\{([^{}]+)\}\{([^{}]+)\}/g,
      (_match, numerator: string, denominator: string) =>
        `${plainFactor(numerator)}/${plainFactor(denominator)}`,
    )
    .replace(/\$([^$\n]+)\$/g, "$1")
    .trim();
};

const main = async () => {
  const question = process.argv.slice(2).join(" ").trim();

  if (!question) {
    console.error('Usage: tsx src/agent.ts "Your question"');
    process.exitCode = 1;
    return;
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are a concise assistant. For arithmetic with numeric operands, always call the calculate tool before answering. Do not call the tool for variables; answer with a plain-text algebraic expression, such as 12q or 12/B. Do not mention tools unless you used one. Return plain text without Markdown, LaTeX, or reasoning tags.",
    },
    {
      role: "user",
      content: question,
    },
  ];

  const firstResponse = await client.chat.completions.create({
    model,
    messages,
    tools,
    tool_choice: "auto",
  });

  const assistantMessage = firstResponse.choices[0].message;

  messages.push(assistantMessage);

  if (assistantMessage.tool_calls) {
    const resultCache = new Map<string, number>();

    for (const toolCall of assistantMessage.tool_calls) {
      if (toolCall.type !== "function") {
        throw new Error(`Unsupported tool type: ${toolCall.type}`);
      }

      if (toolCall.function.name !== "calculate") {
        throw new Error(`Unsupported tool: ${toolCall.function.name}`);
      }

      const args = parseCalculationArgs(toolCall.function.arguments);

      console.log("Tool called:", toolCall.function.name);
      console.log("Arguments:", args);

      const key = JSON.stringify([args.operation, args.a, args.b]);
      let result = resultCache.get(key);

      if (result === undefined) {
        result = calculate(args.operation, args.a, args.b);
        if (!Number.isFinite(result)) {
          throw new Error("Calculation produced a non-finite result.");
        }
        resultCache.set(key, result);
        console.log("Tool result:", result);
      } else {
        console.log("Reused tool result:", result);
      }

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify({ result }),
      });
    }

    const finalResponse = await client.chat.completions.create({
      model,
      messages,
    });

    const finalContent = finalResponse.choices[0].message.content;

    console.log("\nFinal answer:", formatAnswer(finalContent));

    return;
  }

  console.log("Answer:", formatAnswer(assistantMessage.content));
};

try {
  await main();
} catch (error) {
  console.error("Agent failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}
