import 'dotenv/config';
import http from 'http';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import Checkpoint, { createGetLoader } from '@snapshot-labs/checkpoint';
import cors from 'cors';
import fetch from 'cross-fetch';
import express from 'express';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

export async function startApiServer(checkpoint: Checkpoint) {
  const app = express();
  const httpServer = http.createServer(app);
  console.log('--- STARTING ---\n\n');

  app.get('/api/latest-proposals', async (req, res) => {
    console.log('Fetching latest proposals');
    try {
      const space = req.query.space as string | undefined;
      const thirtyMinutesAgo = Math.floor(Date.now() / 1000) - 30 * 60;

      const graphqlQuery = {
        query: `
          query Proposals($where: ProposalWhere, $orderBy: String, $orderDirection: String, $first: Int) {
            proposals(
              where: $where
              orderBy: $orderBy
              orderDirection: $orderDirection
              first: $first
            ) {
              id
              space
              proposal_id
              created
            }
          }
        `,
        variables: {
          where: {
            created_gte: thirtyMinutesAgo,
            ...(space ? { space } : {})
          },
          orderBy: 'created',
          orderDirection: 'desc',
          first: 1000
        }
      };

      const response = await fetch('http://localhost:3000/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graphqlQuery)
      });

      const { data, errors } = await response.json();
      if (errors) {
        throw new Error(JSON.stringify(errors));
      }

      res.json(data.proposals);
    } catch (error) {
      console.error('Error fetching proposals:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

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

  console.log(`Listening on port ${PORT}`);
}
