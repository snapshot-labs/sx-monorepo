import 'dotenv/config';
import http from 'http';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { expressMiddleware } from '@as-integrations/express4';
import Checkpoint, { createGetLoader } from '@snapshot-labs/checkpoint';
import cors from 'cors';
import express from 'express';
import {
  createKnexLastIndexedBlockReader,
  createStarknetHeadFetchers,
  getHealthReport
} from './health';
import logger from './logger';
import { starknetConfigs } from './starknet';

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

  // Indexer health / sync-lag endpoint.
  //
  // Reports, per indexer, the last indexed block vs the current chain head and
  // the derived lag. Returns HTTP 503 when any monitored indexer is unhealthy
  // (lag over threshold or chain head unreachable) so uptime monitors such as
  // Betterstack can alert even while the API process itself is up.
  const headFetchers = createStarknetHeadFetchers(starknetConfigs);
  app.get('/health', async (req, res) => {
    try {
      const { knex } = checkpoint.getBaseContext();
      const report = await getHealthReport(
        createKnexLastIndexedBlockReader(knex),
        headFetchers
      );

      res.status(report.healthy ? 200 : 503).json(report);
    } catch (err) {
      logger.error({ err }, 'failed to build health report');
      res.status(503).json({ healthy: false, error: 'health check failed' });
    }
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
