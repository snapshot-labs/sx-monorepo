import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import Checkpoint, { LogLevel } from '@snapshot-labs/checkpoint';
import { startApiServer } from './api';
import { startIndexer } from './indexer';
import overrides from './overrides.json';

/**
 * IS_INDEXER is a boolean that determines if the current process is an indexer.
 *
 * If not set only GraphQL API will be started.
 */
const IS_INDEXER = process.env.IS_INDEXER === 'true';

const LOGTAIL_HOST = process.env.LOGTAIL_HOST;
const LOGTAIL_TOKEN = process.env.LOGTAIL_TOKEN;

if (process.env.CA_CERT) {
  process.env.CA_CERT = process.env.CA_CERT.replace(/\\n/g, '\n');
}

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

  const pinoOptions =
    LOGTAIL_HOST && LOGTAIL_TOKEN
      ? {
          transport: {
            target: '@logtail/pino',
            options: {
              sourceToken: LOGTAIL_TOKEN,
              options: {
                endpoint: `https://${LOGTAIL_HOST}`
              }
            }
          }
        }
      : {};

  const checkpoint = new Checkpoint(schema, {
    logLevel: LogLevel.Info,
    resetOnConfigChange: true,
    prettifyLogs: process.env.NODE_ENV !== 'production',
    pinoOptions,
    overridesConfig: overrides,
    dbConnection: getDatabaseConnection()
  });

  await startApiServer(checkpoint);

  if (IS_INDEXER) {
    await startIndexer(checkpoint);
  }
}

run();
