# Community Insights Teams Bot

This project demonstrates how to build a Teams application with the **Teams AI Library v2** that collects developer feedback from Stack Overflow and GitHub, extracts insights using an AI model and surfaces them in Teams using Adaptive Cards.

## Prerequisites

- Node.js 18+
- A GitHub personal access token (`GITHUB_TOKEN`)
- Access to an OpenAI or Azure OpenAI model (`OPENAI_API_KEY` or Azure equivalents)

## Setup

1. Install dependencies:

```bash
cd bot
npm install
```

2. Create a `.env` file in the `bot` folder and populate it with your credentials:

```
GITHUB_TOKEN=<your GitHub token>
OPENAI_API_KEY=<openai key>
# or Azure OpenAI values
AZURE_OPENAI_API_KEY=<key>
AZURE_OPENAI_ENDPOINT=<endpoint>
AZURE_OPENAI_API_VERSION=<version>
AZURE_OPENAI_MODEL_DEPLOYMENT_NAME=<deployment>
```

## Running the Bot

To start the bot locally with hot‑reloading:

```bash
npm run dev
```

The bot exposes an MCP server at `http://localhost:3000/mcp` and a devtools inspector at `http://localhost:6274/`.

Run the MCP client in **another terminal** so it connects to the running server. The client continuously pulls posts every five minutes:

```bash
# from bot directory
npm run dev        # start the server
npx ts-node src/client.ts   # in another terminal
```

Adjust the `MCP_SERVER_URL` environment variable if you change the port from the default.

After ingesting posts, send `insights` to the bot in Teams (or in the MCP inspector) to analyze the collected feedback. The bot returns an Adaptive Card with categorized summaries and severity estimates.

## Building for Production

Compile the TypeScript sources with:

```bash
npm run build
```

The compiled files are emitted to the `dist` folder.
