import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { PORT } from './constants';
import ethRpc from './eth';
import { registeredApeGasProposalsLoop } from './eth/registered';
import starkRpc from './stark';
import logger from '../logger';
import pkg from '../package.json';
import {
  registeredProposalsLoop,
  registeredTransactionsLoop
} from './stark/registered';

if (!process.env.WALLET_SECRET) {
  logger.fatal('WALLET_SECRET environment variable is required');
  process.exit(1);
}

const app = express();

const commit = process.env.COMMIT_HASH || '';
const version = commit ? `${pkg.version}#${commit.substr(0, 7)}` : pkg.version;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '4mb', extended: false }));
app.use(cors({ maxAge: 86400 }));
app.use('/eth_rpc', ethRpc);
app.use('/stark_rpc', starkRpc);

app.get('/', (req, res) =>
  res.json({
    version,
    port: PORT
  })
);

async function start() {
  registeredTransactionsLoop();
  registeredProposalsLoop();
  registeredApeGasProposalsLoop();

  app.listen(PORT, () => logger.info(`Listening at http://localhost:${PORT}`));
}

start();
