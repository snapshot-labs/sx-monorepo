import 'dotenv/config';
import express from 'express';
import pino from 'pino';
import { config } from './config.js';
import { startPolling } from './poller.js';

const logger = pino({ transport: { target: 'pino-pretty' } });
const app = express();

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'snack-oracle' });
});

app.listen(config.port, () => {
  logger.info({ port: config.port }, 'Snack oracle server started');

  if (!config.factoryAddress) {
    logger.warn(
      'FACTORY_ADDRESS not set — polling disabled. Set it and restart.'
    );
    return;
  }

  startPolling().catch(err => {
    logger.error({ err }, 'Failed to start polling');
  });
});
