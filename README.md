# Community Insights Teams Bot

Community Insights is a sample Teams application built with the **Teams AI Library v2**. It ingests developer posts from GitHub and Stack Overflow through the MCP client/server protocol, extracts actionable insights using a language model and then surfaces those insights in Teams using Adaptive Cards.

## Prerequisites

- **Node.js 18+**
- A GitHub personal access token (`GITHUB_TOKEN`)
- Access to an OpenAI or Azure OpenAI model (`OPENAI_API_KEY` or Azure equivalents)

## Setup

1. Install dependencies:

```bash
cd bot
npm install
```

2. Create a `.env` file in the `bot` folder and populate it with your credentials:

```bash
GITHUB_TOKEN=<your GitHub token>
OPENAI_API_KEY=<openai key>
# or Azure OpenAI values
AZURE_OPENAI_API_KEY=<key>
AZURE_OPENAI_ENDPOINT=<endpoint>
AZURE_OPENAI_API_VERSION=<version>
AZURE_OPENAI_MODEL_DEPLOYMENT_NAME=<deployment>
```

## Running the Bot

Start the bot locally with hot-reloading:

```bash
npm run dev
```

The bot exposes an MCP server at `http://localhost:3000/mcp` and a DevTools inspector at `http://localhost:6274/?transport=streamable-http&serverUrl=http://localhost:3000/mcp`.
Open that full URL so the inspector connects to the running server.

Run the MCP client in **another terminal** so it connects to the running server. The client continuously pulls new posts every five minutes:

```bash
# from the bot directory
npm run dev                 # start the server
npx ts-node src/client.ts   # run the client
```

Adjust the `MCP_SERVER_URL` environment variable if you change the port from the default.

The client stores previously ingested IDs in `bot/ingested.json`. Delete this file if you want to re-ingest everything.

After ingesting posts, send `insights` to the bot in Teams (or in the MCP inspector) to receive an Adaptive Card summarising each feedback item. Send `action` to get a concise list of the five most urgent issues ordered by severity and age.

## Additional Configuration

- `fetchGitHubIssues` in `src/collector/github.ts` defaults to the `OfficeDev/microsoft-teams-library-js` repository. Modify the parameters to point to another repo if required.
- `fetchStackPosts` in `src/collector/stack.ts` fetches questions tagged `microsoft-teams`. Update the tag or time window to target a different set of posts.

## Building for Production

Compile the TypeScript sources:

```bash
npm run build
```

The compiled files are emitted to the `dist` folder. Run `node .` from the `bot` directory to start the compiled app.
