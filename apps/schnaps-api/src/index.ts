import 'dotenv/config';
import './instrument';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import Checkpoint, { evm, LogLevel } from '@snapshot-labs/checkpoint';
import { Sentry } from '@snapshot-labs/snapshot-sentry';
import cors from 'cors';
import express from 'express';
import { createConfig, NETWORK, NETWORKS } from './config';
import { startExpirationMonitor } from './expirationMonitor';
import overrides from './overrides.json';
import { stripe } from './stripe/client';
import { STRIPE_INDEXER, stripeConfig } from './stripe/config';
import { StripeIndexer } from './stripe/indexer';
import stripeRouter from './stripe/routes';
import { createStripeWriters } from './stripe/writers';
import { sleep } from './utils';
import { createEvmWriters } from './writers';

// Node exits on an unhandled rejection by default; Sentry's 'warn' mode does not.
process.on('unhandledRejection', err => {
  console.error('Unhandled rejection, exiting:', err);
  Sentry.flush(2000).finally(() => process.exit(1));
});

const PRODUCTION_INDEXER_DELAY = 60 * 1000;
const dir = __dirname.endsWith('dist/src') ? '../' : '';
const schemaFile = path.join(__dirname, `${dir}../src/schema.gql`);
const schema = fs.readFileSync(schemaFile, 'utf8');

// The database is rebuilt from chain only when what gets indexed changes:
// the schema, the writers or their config. Other restarts resume.
const INDEXING_FILES = [
  'writers.ts',
  'config.ts',
  'payment_tokens.json',
  'overrides.json',
  'stripe/writers.ts',
  'stripe/indexer.ts',
  'stripe/config.ts'
];
const indexingHash = createHash('sha256')
  .update(schema)
  .update(
    INDEXING_FILES.map(file =>
      fs.readFileSync(path.join(__dirname, `${dir}../src`, file), 'utf8')
    ).join('\n')
  )
  .digest('hex');

if (process.env.CA_CERT) {
  process.env.CA_CERT = process.env.CA_CERT.replace(/\\n/g, '\n');
}

const config = createConfig(NETWORK);

const checkpoint = new Checkpoint(schema, {
  logLevel: LogLevel.Info,
  prettifyLogs: true,
  overridesConfig: overrides
});

for (const network of NETWORKS) {
  const indexer = process.env.HYPERSYNC_API_TOKEN
    ? new evm.HyperSyncEvmIndexer(createEvmWriters(network), {
        apiToken: process.env.HYPERSYNC_API_TOKEN
      })
    : new evm.EvmIndexer(createEvmWriters(network));
  checkpoint.addIndexer(network, createConfig(network), indexer);
}

if (stripe) {
  checkpoint.addIndexer(
    STRIPE_INDEXER,
    stripeConfig,
    new StripeIndexer(createStripeWriters())
  );
}

async function run() {
  if (process.env.NODE_ENV === 'production') {
    console.log(
      'Delaying indexer to prevent multiple processes indexing at the same time.'
    );
    await sleep(PRODUCTION_INDEXER_DELAY);
  }

  await checkpoint.syncVersion(
    `${NETWORKS.join(':')}:${stripe ? 'stripe' : 'no-stripe'}:${indexingHash}`
  );
  checkpoint.start();
  startExpirationMonitor(checkpoint, config);
}

run();

const app = express();
app.use(cors({ maxAge: 86400 }));
app.use('/stripe', stripeRouter);
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ limit: '4mb', extended: false }));
app.use('/', checkpoint.graphql);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening at http://localhost:${PORT}`));
