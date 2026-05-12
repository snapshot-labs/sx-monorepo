import { URL } from 'url';
import { capture } from '@snapshot-labs/snapshot-sentry';
import snapshot from '@snapshot-labs/snapshot.js';
import log from './log';

type Strategy = {
  id: string;
  override: boolean;
  disabled: boolean;
};

const RUN_INTERVAL = 60e3 * 5; // 5 minutes
const MAX_CONSECUTIVE_FAILS = 3;
const URI = new URL(
  '/api/strategies',
  process.env.SCORE_API_URL ?? 'https://score.snapshot.org'
).toString();

let consecutiveFailsCount = 0;
let shouldStop = false;
let strategies: Record<Strategy['id'], Strategy> = {};

async function loadStrategies() {
  const res = await snapshot.utils.getJSON(URI);

  if ('error' in res) {
    const error = new Error(
      `Failed to load strategies: ${res.error.message || JSON.stringify(res.error)}`
    );
    capture(error, {
      contexts: { input: { uri: URI }, res }
    });
    throw error;
  }

  const strategiesList = Object.values(res).map((strategy: any) => ({
    id: strategy.key,
    override: strategy.dependOnOtherAddress || false,
    disabled: strategy.disabled || false
  }));

  strategies = Object.fromEntries(
    strategiesList.map(strategy => [strategy.id, strategy])
  );
}

// Using a getter to avoid potential reference initialization issues
export function getStrategies(): Record<Strategy['id'], Strategy> {
  return strategies;
}

export async function initialize() {
  log.info('[strategies] Initial strategies load');
  await loadStrategies();
  log.info('[strategies] Initial strategies load complete');
}

export async function run() {
  log.info('[strategies] Start strategies refresh loop');

  while (!shouldStop) {
    // Delay the first run to avoid immediate execution after initialize()
    // if stop() has been called after sleep started,
    // the loop will exit only after the sleep has completed
    await snapshot.utils.sleep(RUN_INTERVAL);
    try {
      log.info('[strategies] Start strategies refresh');
      await loadStrategies();
      consecutiveFailsCount = 0;
      log.info('[strategies] End strategies refresh');
    } catch (err: any) {
      consecutiveFailsCount++;

      if (consecutiveFailsCount >= MAX_CONSECUTIVE_FAILS) {
        capture(err);
      }
      log.error(`[strategies] failed to load ${JSON.stringify(err)}`);
    }
  }
}

export function stop() {
  log.info('[strategies] Stopping strategies refresh');
  shouldStop = true;
}
