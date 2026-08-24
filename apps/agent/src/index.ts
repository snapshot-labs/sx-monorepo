import { app } from './api';
import { AGENT_SIGNER_ADDRESS } from './clients/sequencer';
import {
  AGENT_PRIVATE_KEY,
  DRY_RUN,
  OPENROUTER_API_KEY,
  PORT,
  SPACE_IDS,
  TICK_INTERVAL
} from './config';
import logger from './logger';
import { createLoop } from './loop';
import { tick } from './pipeline';

if (!AGENT_PRIVATE_KEY) {
  throw new Error('AGENT_PRIVATE_KEY must be set to a hex private key');
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
    signer: AGENT_SIGNER_ADDRESS,
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
