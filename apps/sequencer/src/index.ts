import 'dotenv/config';
import './instrument';
import { fallbackLogger } from '@snapshot-labs/snapshot-sentry';
import cors from 'cors';
import express from 'express';
import api from './api';
import startBackgroundTask from './helpers/backgroundTask';
import deleteProposalVotes from './helpers/deleteProposalVotes';
import log from './helpers/log';
import initMetrics from './helpers/metrics';
import refreshModeration from './helpers/moderation';
import refreshProposalsScoresValue from './helpers/proposalsScoresValue';
import refreshProposalsVpValue from './helpers/proposalStrategiesValue';
import rateLimit from './helpers/rateLimit';
import shutter from './helpers/shutter';
import {
  initialize as initializeStrategies,
  run as refreshStrategies,
  stop as stopStrategies
} from './helpers/strategies';
import { trackTurboStatuses } from './helpers/turbo';
import refreshVotesVpValue from './helpers/votesVpValue';

const app = express();
const stopBackgroundTasks: (() => void)[] = [];

async function startServer() {
  const backgroundTasks = {
    refreshModeration,
    refreshProposalsVpValue,
    refreshProposalsScoresValue,
    refreshVotesVpValue,
    deleteProposalVotes
  };
  for (const [name, task] of Object.entries(backgroundTasks)) {
    stopBackgroundTasks.push(startBackgroundTask(name, task));
  }

  await initializeStrategies();
  refreshStrategies();

  initMetrics(app);
  trackTurboStatuses();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ limit: '20mb', extended: false }));
  app.use(cors({ maxAge: 86400 }));
  app.use(rateLimit);
  app.set('trust proxy', 1);
  app.use('/', api);
  app.use('/shutter', shutter);

  fallbackLogger(app);

  const PORT = process.env.PORT || 3001;
  return app.listen(PORT, () =>
    log.info(`Started on: http://localhost:${PORT}`)
  );
}

startServer()
  .then(server => {
    const gracefulShutdown = (signal: string) => {
      log.info(`Received ${signal}, shutting down gracefully...`);

      stopStrategies();
      stopBackgroundTasks.forEach(stop => stop());

      server.close(() => {
        log.info('Server closed');
        process.exit(0);
      });

      setTimeout(() => {
        log.error(
          'Could not close connections in time, forcefully shutting down'
        );
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  })
  .catch(error => {
    log.error('Failed to start server:', error);
    process.exit(1);
  });
