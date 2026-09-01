import { app } from './api';
import {
  CDP_API_KEY_ID,
  CDP_API_KEY_SECRET,
  CDP_WALLET_SECRET,
  DRY_RUN,
  OPENROUTER_API_KEY,
  PORT,
  SPACE_IDS,
  TICK_INTERVAL
} from './config';
import logger from './logger';
import { createLoop } from './loop';
import { tick } from './pipeline';

if (!CDP_API_KEY_ID || !CDP_API_KEY_SECRET || !CDP_WALLET_SECRET) {
  throw new Error(
    'CDP_API_KEY_ID, CDP_API_KEY_SECRET and CDP_WALLET_SECRET must be set to sign votes'
  );
}

if (!SPACE_IDS.length) {
  throw new Error('SPACES must list at least one space to watch');
}

if (!OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY must be set to predict votes');
}

const loop = createLoop(tick, TICK_INTERVAL);
loop.start();

logger.info(
  {
    spaces: SPACE_IDS,
    dryRun: DRY_RUN,
    interval: TICK_INTERVAL,
    port: PORT
  },
  'agent started'
);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    logger.info({ signal }, 'shutting down');
    loop.stop();
    process.exit(0);
  });
}

export default { port: PORT, fetch: app.fetch };
