import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import Checkpoint, { LogLevel } from '@snapshot-labs/checkpoint';
import { startApiServer } from './api';
import { startIndexer } from './indexer';
import logger, { pinoOptions } from './logger';
import overrides from './overrides.json';

/**
 * IS_INDEXER is a boolean that determines if the current process is an indexer.
 *
 * If not set only GraphQL API will be started.
 */
const IS_INDEXER = process.env.IS_INDEXER === 'true';

if (process.env.CA_CERT) {
  process.env.CA_CERT = process.env.CA_CERT.replace(/\\n/g, '\n');
}

process.on('uncaughtException', err => {
  logger.fatal({ err }, 'Uncaught exception');

  process.exit(1);
});

function getDatabaseConnection() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.DATABASE_URL_INDEX) {
    return process.env[`DATABASE_URL_${process.env.DATABASE_URL_INDEX}`];
  }

  throw new Error('No valid database connection URL found.');
}

async function run() {
  const dir = __dirname.endsWith('dist/src') ? '../' : '';
  const schemaFile = path.join(__dirname, `${dir}../src/schema.gql`);
  const schema = fs.readFileSync(schemaFile, 'utf8');

  const checkpoint = new Checkpoint(schema, {
    logLevel: LogLevel.Info,
    resetOnConfigChange: true,
    pinoOptions,
    overridesConfig: overrides,
    dbConnection: getDatabaseConnection(),
    resolvers: {
      Space: {
        active_proposal_count: async (parent, _args, context) => {
          const now = Math.floor(Date.now() / 1000);
          const tableName = `${parent._indexer}_proposals`;
          const result = await context.knex(tableName)
            .where('space', parent.id)
            .where('start', '<=', now)
            .where('max_end', '>', now)
            .where('cancelled', false)
            .where('executed', false)
            .where('vetoed', false)
            .whereRaw('upper_inf(block_range)')
            .count('* as count')
            .first();
          return Number(result?.count ?? 0);
        }
      }
    }
  });

  await startApiServer(checkpoint);

  if (IS_INDEXER) {
    await startIndexer(checkpoint);
  }
}

run();
