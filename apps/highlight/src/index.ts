import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import Checkpoint, { evm, LogLevel } from '@snapshot-labs/checkpoint';
import cors from 'cors';
import express from 'express';
import { createConfig, getStartBlock } from './config';
import { createWriters } from './writers';

const PORT = process.env.PORT || 3002;

if (process.env.CA_CERT) {
  process.env.CA_CERT = process.env.CA_CERT.replace(/\\n/g, '\n');
}

async function run() {
  const dir = __dirname.endsWith('dist/src') ? '../' : '';
  const schemaFile = path.join(__dirname, `${dir}../src/schema.gql`);
  const schema = fs.readFileSync(schemaFile, 'utf8');

  const checkpoint = new Checkpoint(schema, {
    logLevel: LogLevel.Fatal,
    prettifyLogs: process.env.NODE_ENV !== 'production',
    dbConnection: process.env.API_DATABASE_URL,
    overridesConfig: {}
  });

  const startBlock = getStartBlock();
  console.log('Starting from block', startBlock);
  const config = createConfig(startBlock);

  const writers = createWriters();
  const indexer = new evm.EvmIndexer(writers);
  checkpoint.addIndexer('townhall', config, indexer);

  await checkpoint.reset();
  await checkpoint.resetMetadata();
  console.log('Checkpoint ready');

  checkpoint.start();

  const app = express();
  app.use(express.json({ limit: '4mb' }));
  app.use(express.urlencoded({ limit: '4mb', extended: false }));
  app.use(cors({ maxAge: 86400 }));

  app.get(
    '/townhall/spaces/:spaceId/topics/:topicId/results_by_role/:roleId',
    async (req, res) => {
      const { knex } = checkpoint.getBaseContext();

      const { spaceId, topicId, roleId } = req.params;

      let query = knex('votes')
        .select('votes.post_id', 'choice')
        .countDistinct('votes.voter', { as: 'vote_count' })
        .whereRaw('upper_inf(votes.block_range)')
        .where('topic', `${spaceId}/${topicId}`);

      if (roleId !== 'any') {
        query = query
          .joinRaw(
            "JOIN userroles ON userroles.user = CONCAT(votes.space, '/', votes.voter)"
          )
          .join('roles', 'roles.id', 'userroles.role')
          .whereRaw('upper_inf(userroles.block_range)')
          .where('roles.id', roleId);
      }

      try {
        const result = await query.groupBy('votes.post_id', 'choice');

        return res.json({ result });
      } catch (err) {
        console.error('Error fetching results by role:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  );

  app.use('/', checkpoint.graphql);

  app.listen(PORT, () => console.log(`Listening at http://localhost:${PORT}`));
}

run();
