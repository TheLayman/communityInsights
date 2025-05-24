import { App } from '@microsoft/teams.apps';
import { ChatPrompt, Message } from '@microsoft/teams.ai';
import { LocalStorage } from '@microsoft/teams.common/storage';
import { DevtoolsPlugin } from '@microsoft/teams.dev';
import { OpenAIChatModel } from '@microsoft/teams.openai'; // <-- updated import

const storage = new LocalStorage<Array<Message>>();
const app = new App({
  storage,
  plugins: [new DevtoolsPlugin()],
});

app.on('message', async ({ stream, activity }) => {
  const prompt = new ChatPrompt({
    messages: storage.get(`${activity.conversation.id}/${activity.from.id}`),
    model : new OpenAIChatModel({
    apiKey: process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION,
    model: process.env.AZURE_OPENAI_MODEL_DEPLOYMENT_NAME!,
  }),
  });

  await prompt.send(activity.text, {
    onChunk: (chunk) => stream.emit(chunk),
  });
});

(async () => {
  await app.start(+(process.env.PORT || 3000));
})();
