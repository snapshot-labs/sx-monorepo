import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import Checkpoint, { LogLevel } from '@snapshot-labs/checkpoint';
import config from './config.json';
import spaceFactoryAbi from './abis/spaceFactory.json';
import spaceAbi from './abis/space.json';
import * as writer from './writer';

const dir = __dirname.endsWith('dist/src') ? '../' : '';
const schemaFile = path.join(__dirname, `${dir}../src/schema.gql`);
const schema = fs.readFileSync(schemaFile, 'utf8');

if (process.env.NETWORK_NODE_URL) {
  config.network_node_url = process.env.NETWORK_NODE_URL;
}

if (process.env.CA_CERT) {
  process.env.CA_CERT = process.env.CA_CERT.replace(/\\n/g, '\n');
}

const checkpoint = new Checkpoint(config, writer, schema, {
  logLevel: LogLevel.Fatal,
  resetOnConfigChange: true,
  prettifyLogs: process.env.NODE_ENV !== 'production',
  abis: {
    SpaceFactory: spaceFactoryAbi,
    Space: spaceAbi
  }
});

async function run() {
  await checkpoint.reset();
  await checkpoint.resetMetadata();

  await checkpoint.start();
}

run();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ limit: '4mb', extended: false }));
app.use(cors({ maxAge: 86400 }));
app.get('/ping', (req, res) => res.send({ status: 'ok' }));
app.use('/', checkpoint.graphql);

app.listen(PORT, () => console.log(`Listening at http://localhost:${PORT}`));
