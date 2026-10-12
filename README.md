# Local mimOE Calculator Agent

A small TypeScript agent that uses a local model through mimOE Studio's OpenAI-compatible API.

The agent receives a question, the model decides whether to request the calculator tool, and the program runs the calculation locally before the model returns a final answer.

I used the BYO Framework approach with Node.js, TypeScript, and the OpenAI JavaScript SDK. I tested the agent with the locally loaded `qwen3-1.7b` model.

## Requirements

- Node.js 22 or newer
- [mimOE Studio](https://developer.mimik.com/mimOE-studio-early-access-download-v2)
- A local model downloaded and loaded in mimOE Studio
- The mimOE runtime running in [External mode](https://mimoestudio.mimik.com/features/install.html), which exposes an API to programs on the same device

## Setup

1. Start the mimOE runtime in External mode and connect to it in Studio.

2. Open **AI Models**, select a local model, and load it.

3. Click **API** for the loaded model and note the base URL, API key, and model ID.

4. Install the dependencies and create a local environment file:

   ```bash
   npm ci
   cp .env.example .env
   ```

5. Edit `.env` using the values shown in Studio. Replace the API key and model ID, and update the URL if your instance shows a different one:

   ```dotenv
   MIMOE_BASE_URL=http://localhost:8083/mimik-ai/openai/v1
   MIMOE_API_KEY=replace-with-key-from-studio
   MIMOE_MODEL=replace-with-loaded-model-id
   ```

The URL above is an example. The `.env` file is ignored by Git.

## Run

Check that the local model responds through the API:

```bash
npm run hello
```

Ask the agent a question:

```bash
npm run agent -- "What is 12 multiplied by 7?"
```

Example output:

```text
Tool called: calculate
Arguments: { operation: 'multiply', a: 12, b: 7 }
Tool result: 84

Final answer: 84
```

Run the lint and formatting checks:

```bash
npm run check
```

## How it works

The OpenAI JavaScript SDK uses `MIMOE_BASE_URL` to send requests to the local mimOE runtime. I confirmed that `GET /models` listed `qwen3-1.7b`, then used `POST /chat/completions` for inference. Both paths are relative to the base URL above.

The flow is:

1. Send the question and the `calculate` tool definition to the model.
2. If the model requests a calculation, execute it in Node.js. The tool supports addition, subtraction, multiplication, and division.
3. Reuse the result if the same calculation is requested again in that response, while returning a tool message for every tool-call ID.
4. Send the tool results to the model and request its final answer.

## Why I chose this approach

I used the OpenAI SDK directly instead of adding an agent framework such as LangChain.

The task is small, so I wanted to keep the implementation simple and make the interaction with mimOE's OpenAI-compatible API easy to understand.

This also keeps the main agent flow visible in the code:

```text
User
↓
Local model
↓
Tool call
↓
Calculator
↓
Tool result
↓
Local model
↓
Final answer
```

With a locally loaded model, this example does not call a cloud LLM API.

## Limitations

This example handles one question and one round of tool calls per run. Model behavior can vary, including whether it calls the tool and how it words the final answer. A larger application would validate model-supplied tool arguments and support a multi-turn interactive CLI.
