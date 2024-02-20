import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import starkRpc from './stark';
import ethRpc from './eth';
import fossil from './fossil';
import pkg from '../package.json';
import { createTables } from './db';
import { registeredProposalsLoop, registeredTransactionsLoop } from './stark/registered';

const app = express();
const PORT = process.env.PORT || 3001;
const commit = process.env.COMMIT_HASH || '';
const version = commit ? `${pkg.version}#${commit.substr(0, 7)}` : pkg.version;

app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ limit: '4mb', extended: false }));
app.use(cors({ maxAge: 86400 }));
app.use('/fossil', fossil);
app.use('/eth_rpc', ethRpc);
app.use('/stark_rpc', starkRpc);

app.get('/', (req, res) =>
  res.json({
    version,
    port: PORT,
    starknet_address: process.env.STARKNET_ADDRESS || '',
    eth_address: process.env.ETH_ADDRESS || '',
    fossil_address: process.env.FOSSIL_ADDRESS || ''
  })
);

async function start() {
  await createTables();

  registeredTransactionsLoop();
  registeredProposalsLoop();

  app.listen(PORT, () => console.log(`Listening at http://localhost:${PORT}`));
}

start();
