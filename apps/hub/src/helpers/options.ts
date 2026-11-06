import { capture } from '@snapshot-labs/snapshot-sentry';
import snapshot from '@snapshot-labs/snapshot.js';
import log from './log';
import db from './mysql';

const RUN_INTERVAL = 120e3;

export let options: { name: string; value: string }[] = [];
let isLoaded = false;

// A numeric option, 0 when missing, null until the cache first loads
export function getNumberOption(name: string): number | null {
  if (!isLoaded) return null;
  return Number(options.find(option => option.name === name)?.value ?? 0);
}

async function loadOptions() {
  options = await db.queryAsync('SELECT s.* FROM options s');
  isLoaded = true;
}

export default async function run() {
  while (true) {
    try {
      log.info('[options] Start options refresh');
      await loadOptions();
      log.info(`[options] ${options.length} options reloaded`);
      log.info('[options] End options refresh');
    } catch (err: any) {
      capture(err);
      log.error(`[options] failed to refresh options, ${JSON.stringify(err)}`);
    }
    await snapshot.utils.sleep(RUN_INTERVAL);
  }
}
