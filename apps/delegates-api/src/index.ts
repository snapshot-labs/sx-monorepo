import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { startStandaloneServer } from '@apollo/server/standalone';
import Checkpoint, {
  createGetLoader,
  LogLevel
} from '@snapshot-labs/checkpoint';
import { addEvmIndexers } from './evm';
import overridesConfig from './overrides.json';
import { addStarknetIndexers } from './starknet';

const dir = __dirname.endsWith('dist/src') ? '../' : '';
const schemaFile = path.join(__dirname, `${dir}../src/schema.gql`);
const schema = fs.readFileSync(schemaFile, 'utf8');

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const GIT_COMMIT = process.env.GIT_COMMIT;

/**
 * IS_INDEXER is a boolean that determines if the current process is an indexer.
 *
 * If not set only GraphQL API will be started.
 */
const IS_INDEXER = process.env.IS_INDEXER === 'true';

if (process.env.CA_CERT) {
  process.env.CA_CERT = process.env.CA_CERT.replace(/\\n/g, '\n');
}

async function startIndexer(checkpoint: Checkpoint) {
  addEvmIndexers(checkpoint);
  addStarknetIndexers(checkpoint);

  const versionTag = GIT_COMMIT ? `commit:${GIT_COMMIT}` : undefined;

  await checkpoint.syncVersion(versionTag);
  checkpoint.start();
}

async function run() {
  const checkpoint = new Checkpoint(schema, {
    logLevel: LogLevel.Info,
    resetOnConfigChange: true,
    skipBlockFetching: true,
    prettifyLogs: process.env.NODE_ENV !== 'production',
    overridesConfig
  });

  const server = new ApolloServer({
    schema: checkpoint.getSchema(),
    plugins: [ApolloServerPluginLandingPageLocalDefault({ footer: false })],
    introspection: true
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: PORT },
    context: async () => {
      const baseContext = checkpoint.getBaseContext();
      return {
        ...baseContext,
        getLoader: createGetLoader(baseContext)
      };
    }
  });

  console.log(`Listening at ${url}`);

  if (IS_INDEXER) {
    await startIndexer(checkpoint);
  }
}

run();
