import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { AGENTS_MAP } from './agents';
import createCheckpoint from './api';
import { RedisAdapter } from './highlight/adapter/redis';
import Highlight from './highlight/highlight';
import createRpc from './rpc';

const PORT = process.env.PORT || 3002;
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

  app.get(
    '/townhall/discussions/:discussionId/results_by_role/:roleId',
    async (req, res) => {
      const { knex } = checkpoint.getBaseContext();

      const { discussionId, roleId } = req.params;

      let query = knex('votes')
        .select('votes.statement_id', 'choice')
        .countDistinct('votes.voter', { as: 'vote_count' })
        .whereRaw('upper_inf(votes.block_range)')
        .where('discussion_id', discussionId);

      if (roleId !== 'any') {
        query = query
          .join('userroles', 'userroles.user', 'votes.voter')
          .join('roles', 'roles.id', 'userroles.role')
          .whereRaw('upper_inf(userroles.block_range)')
          .where('roles.id', roleId);
      }

      const result = await query.groupBy('votes.statement_id', 'choice');

      res.json({ result });
    }
  );
  app.use('/', checkpoint.graphql);

  app.listen(PORT, () => console.log(`Listening at http://localhost:${PORT}`));
}

run();
