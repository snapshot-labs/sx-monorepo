import 'dotenv/config';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { writeHeapSnapshot } from 'v8';
import cors from 'cors';
import express from 'express';
import { PORT } from './constants';
import ethRpc, { handlers as ethHandlers } from './eth';
import pkg from '../package.json';
import { registeredApeGasProposalsLoop } from './eth/registered';
import logger from './logger';
import starkRpc from './stark';
import {
  registeredProposalsLoop,
  registeredTransactionsLoop
} from './stark/registered';

if (!process.env.WALLET_SECRET) {
  logger.fatal('WALLET_SECRET environment variable is required');
  process.exit(1);
}

const app = express();

const debugSecret = process.env.DEBUG_SECRET;
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
    port: PORT,
    posterWallets: {
      base: ethHandlers[8453]?.getWallet('poster').address,
      sep: ethHandlers[11155111]?.getWallet('poster').address
    }
  })
);

app.get('/debug/heapdump', (req, res) => {
  if (!debugSecret || req.header('secret') !== debugSecret) {
    res.status(403).send('Forbidden');
    return;
  }

  const filename = path.join(os.tmpdir(), `heap-${Date.now()}.heapsnapshot`);
  writeHeapSnapshot(filename);

  res.download(filename, err => {
    if (err) logger.error({ err }, 'Error sending heap snapshot');
    fs.unlinkSync(filename);
  });
});

async function start() {
  registeredTransactionsLoop();
  registeredProposalsLoop();
  registeredApeGasProposalsLoop();

  const server = app.listen(PORT, () =>
    logger.info(`Listening at http://localhost:${PORT}`)
  );

  process.on('uncaughtException', err => {
    logger.fatal({ err }, 'Uncaught exception');

    server.close(() => {
      process.exit(1);
    });
  });
}

start();
