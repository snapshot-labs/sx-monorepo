import { app } from './api';
import {
  AGENT_SIGNER_ADDRESS,
  DRY_RUN,
  PORT,
  SPACE_IDS,
  TICK_INTERVAL
} from './config';
import logger from './logger';
import { createLoop } from './loop';
import { tick } from './pipeline';

if (!/^0x[0-9a-fA-F]{40}$/.test(AGENT_SIGNER_ADDRESS)) {
  throw new Error(
    'AGENT_SIGNER_ADDRESS must be set to the address users authorize as an alias'
  );
}

if (!SPACE_IDS.length) {
  throw new Error('SPACES must list at least one space to watch');
}

if (!DRY_RUN) {
  throw new Error('casting is not implemented yet, DRY_RUN cannot be disabled');
}

const loop = createLoop(tick, TICK_INTERVAL);
loop.start();

logger.info(
  { spaces: SPACE_IDS, interval: TICK_INTERVAL, port: PORT },
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
