import 'dotenv/config';
import './instrument';
import { capture, fallbackLogger } from '@snapshot-labs/snapshot-sentry';
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
import './helpers/strategies';

/** Crash-loudly handlers for the two paths Node otherwise eats silently.
 *  Without these, an `uncaughtException` (Node 18+) or
 *  `unhandledRejection` (Node 20+) terminates the process with no stack
 *  trace in the logs — exactly the "2-min silence then restart" pattern
 *  we hit on 2026-05-28. Capture to Sentry first, log a sentinel line,
 *  then re-throw so the orchestrator restarts cleanly. */
process.on('uncaughtException', err => {
  log.error(`[fatal] uncaughtException: ${err?.message}\n${err?.stack}`);
  capture(err);
  setTimeout(() => process.exit(1), 200);
});
process.on('unhandledRejection', reason => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  log.error(`[fatal] unhandledRejection: ${err.message}\n${err.stack}`);
  capture(err);
  setTimeout(() => process.exit(1), 200);
});

/** Heartbeat — emits one line every 30s so a missing tick is an
 *  instantly-visible signal in the log stream. The 2-min silent stall
 *  on 2026-05-28 took ~2 minutes to be noticed and another minute to
 *  diagnose because the only signal was "no logs". A predictable beat
 *  lets a Better Stack alert fire on a 60s gap. */
setInterval(() => {
  const mem = process.memoryUsage();
  log.info(
    `[heartbeat] up ${Math.round(process.uptime())}s | rss ${Math.round(mem.rss / 1048576)}MB | heap ${Math.round(mem.heapUsed / 1048576)}/${Math.round(mem.heapTotal / 1048576)}MB`
  );
}, 30e3).unref();

const app = express();
const PORT = process.env.PORT || 3000;

initMetrics(app);
refreshSpacesCache();

app.disable('x-powered-by');
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: false }));
app.use(cors({ maxAge: 86400 }));
app.set('trust proxy', 1);
app.use(checkKeycard, rateLimit);
app.use('/api', api);
app.use('/api/eip4824', eip4824);
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
