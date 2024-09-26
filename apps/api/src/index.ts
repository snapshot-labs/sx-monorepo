import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { startStandaloneServer } from '@apollo/server/standalone';
import Checkpoint, {
  createGetLoader,
  LogLevel,
  starknet
} from '@snapshot-labs/checkpoint';
import spaceAbi from './abis/space.json';
import spaceFactoryAbi from './abis/spaceFactory.json';
import config from './currentConfig';
import * as writer from './writer';

const dir = __dirname.endsWith('dist/src') ? '../' : '';
const schemaFile = path.join(__dirname, `${dir}../src/schema.gql`);
const schema = fs.readFileSync(schemaFile, 'utf8');

const PRODUCTION_INDEXER_DELAY = 60 * 1000;
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

if (process.env.CA_CERT) {
  process.env.CA_CERT = process.env.CA_CERT.replace(/\\n/g, '\n');
}

const indexer = new starknet.StarknetIndexer(writer);
const checkpoint = new Checkpoint(config, indexer, schema, {
  logLevel: LogLevel.Info,
  resetOnConfigChange: true,
  prettifyLogs: process.env.NODE_ENV !== 'production',
  abis: {
    SpaceFactory: spaceFactoryAbi,
    Space: spaceAbi
  }
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
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

  if (process.env.NODE_ENV === 'production') {
    console.log(
      'Delaying indexer to prevent multiple processes indexing at the same time.'
    );
    await sleep(PRODUCTION_INDEXER_DELAY);
  }

  await checkpoint.reset();
  checkpoint.start();
}

run();
