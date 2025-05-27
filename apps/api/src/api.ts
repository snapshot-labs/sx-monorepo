import 'dotenv/config';
import http from 'http';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import Checkpoint, { createGetLoader } from '@snapshot-labs/checkpoint';
import cors from 'cors';
import express from 'express';
import { Proposal } from '../.checkpoint/models';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

export async function startApiServer(checkpoint: Checkpoint) {
  const app = express();
  const httpServer = http.createServer(app);
  console.log('--- STARTING ---\n\n');

  app.get('/api/newest-proposals', async (req, res) => {
    console.log('Fetching newest proposals');

    try {
      const space = req.query.space as string;

      const thirtyMinutesAgo = Math.floor(Date.now() / 1000) - 30 * 60;

      // Get all proposals from the last 30 minutes
      const proposals = await Promise.all(
        Array.from({ length: 100 }, async (_, i) => {
          const proposalId = `${space || 'all'}/${i}`;
          const proposal = await Proposal.loadEntity(proposalId, 'starknet');
          if (proposal && proposal.created >= thirtyMinutesAgo) {
            return proposal;
          }
          return null;
        })
      );

      // Filter out null values and proposals from other spaces if space parameter is provided
      const validProposals = proposals.filter(
        (proposal): proposal is Proposal =>
          proposal !== null && (!space || proposal.space === space)
      );

      console.log(`Found ${validProposals.length} valid proposals`);

      res.json(
        validProposals.map(proposal => ({
          id: proposal.id,
          space: proposal.space,
          proposal_id: proposal.proposal_id,
          created: proposal.created
        }))
      );
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
