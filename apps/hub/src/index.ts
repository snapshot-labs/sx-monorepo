import 'dotenv/config';
import './instrument';
import { fallbackLogger } from '@snapshot-labs/snapshot-sentry';
import cors from 'cors';
import express from 'express';
import api from './api';
import eip4824 from './eip4824';
import graphql from './graphql';
import { checkKeycard } from './helpers/keycard';
import log from './helpers/log';
import initMetrics from './helpers/metrics';
import { closeDatabase } from './helpers/mysql';
import rateLimit from './helpers/rateLimit';
import refreshSpacesCache from './helpers/spaces';
import te from './te';
import './helpers/strategies';

/** Heartbeat — one log line every 30s. A missing tick = the process is
 *  dead or its event loop is blocked; alertable via a `>60s gap` rule. */
setInterval(() => {
  const m = process.memoryUsage();
  log.info(
    `[heartbeat] up ${Math.round(process.uptime())}s | rss ${Math.round(m.rss / 1048576)}MB | heap ${Math.round(m.heapUsed / 1048576)}/${Math.round(m.heapTotal / 1048576)}MB`
  );
}, 30e3).unref();

const app = express();
const PORT = process.env.PORT || 3000;

const { stop: stopMetrics } = initMetrics(app);
refreshSpacesCache();

app.disable('x-powered-by');
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: false }));
app.use(cors({ maxAge: 86400 }));
app.set('trust proxy', 1);
app.use(checkKeycard, rateLimit);
app.use('/api', api);
app.use('/api/eip4824', eip4824);
app.use('/api', te);
app.use('/graphql', graphql);

fallbackLogger(app);
app.get('/*', (req, res) => res.redirect('/api'));

const server = app.listen(PORT, () =>
  log.info(`Started on: http://localhost:${PORT}`)
);

const gracefulShutdown = async (signal: string) => {
  log.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    log.info('Express server closed.');

    try {
      stopMetrics();
      await closeDatabase();
      log.info('Graceful shutdown completed.');
      process.exit(0);
    } catch (err) {
      log.error('Error during shutdown:', err);
      process.exit(1);
    }
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
