import 'dotenv/config';
import { buildApp } from './app';
import log from './log';

const PORT = Number(process.env.PORT || 3002);

// Fail at startup rather than per request: without a hub there is nothing to
// translate, and a process that answers 502 to everything is worse than one that
// refuses to start and says why.
if (!process.env.HUB_URL?.trim()) {
  log.error('HUB_URL is required');
  process.exit(1);
}

const server = buildApp().listen(PORT, () =>
  log.info(
    `te-data-layer on http://localhost:${PORT} → hub ${process.env.HUB_URL}`
  )
);

function shutdown(signal: string): void {
  log.info(`received ${signal}, closing`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
