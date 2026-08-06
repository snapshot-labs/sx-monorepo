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
        active_proposal_count: {
          sql: knex =>
            knex('proposals')
              .count('*')
              .where('proposals.space', knex.ref('spaces.id'))
              .where('proposals._indexer', knex.ref('spaces._indexer'))
              .where(
                'proposals.start',
                '<=',
                knex.raw('extract(epoch from now())::integer')
              )
              .where(
                'proposals.max_end',
                '>',
                knex.raw('extract(epoch from now())::integer')
              )
              .where('proposals.cancelled', false)
              .where('proposals.executed', false)
              .where('proposals.vetoed', false)
              .whereRaw('upper_inf(proposals.block_range)')
        }
      },
      Proposal: {
        state: {
          sql: knex =>
            knex.select(
              knex.raw(
                `case
                  when proposals.start > extract(epoch from now())::integer then 'pending'
                  when proposals.max_end > extract(epoch from now())::integer then 'active'
                  else 'closed'
                end`
              )
            )
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
