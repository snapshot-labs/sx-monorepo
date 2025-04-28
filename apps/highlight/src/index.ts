import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { Server } from 'ws';
import { AGENTS_MAP } from './agents';
import createCheckpoint from './api';
import { RedisAdapter } from './highlight/adapter/redis';
import Highlight from './highlight/highlight';
import { Event } from './highlight/types';
import createRpc from './rpc';

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL || '';

async function run() {
  const adapter = new RedisAdapter({ url: DATABASE_URL });
  const highlight = new Highlight({ adapter, agents: AGENTS_MAP });

  await highlight.reset();

  console.log('Highlight reset complete');

  const rpc = createRpc(highlight);
  const checkpoint = await createCheckpoint(highlight);

  const app = express();
  app.use(express.json({ limit: '4mb' }));
  app.use(express.urlencoded({ limit: '4mb', extended: false }));
  app.use(cors({ maxAge: 86400 }));

  app.use('/highlight', rpc);
  app.use('/', checkpoint.graphql);

  const server = app.listen(PORT, () =>
    console.log(`Listening at http://localhost:${PORT}`)
  );

  const wss = new Server({ server });

  highlight.on('events', (events: Event[]) => {
    for (const event of events) {
      wss.clients.forEach(ws => {
        try {
          ws.send(
            JSON.stringify([
              'justsaying',
              { subject: event.key, body: event.data }
            ])
          );
        } catch (e) {
          console.log(e);
        }
      });
    }
  });
}

run();
