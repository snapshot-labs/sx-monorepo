import 'dotenv/config';
import http from 'http';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import Checkpoint, { createGetLoader } from '@snapshot-labs/checkpoint';
import cors from 'cors';
import express from 'express';
import logger from './logger';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

export async function startApiServer(checkpoint: Checkpoint) {
  const app = express();
  const httpServer = http.createServer(app);

  const server = new ApolloServer({
    schema: checkpoint.getSchema(),
    plugins: [
      ApolloServerPluginLandingPageLocalDefault({ footer: false }),
      ApolloServerPluginDrainHttpServer({ httpServer })
    ],
    introspection: true
  });

  await server.start();

  app.use(cors());
  app.get('/deployment', (req, res) => {
    res.json({
      index: process.env.DATABASE_URL_INDEX ?? 'default'
    });
  });

  app.use(
    '/',
    express.json({ limit: '50mb' }),
    expressMiddleware(server, {
      context: async () => {
        const baseContext = checkpoint.getBaseContext();
        return {
          ...baseContext,
          getLoader: createGetLoader(baseContext)
        };
      }
    })
  );

  await new Promise<void>(resolve =>
    httpServer.listen({ port: PORT }, resolve)
  );

  logger.info(`Listening on port ${PORT}`);
}
