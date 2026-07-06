import { capture } from '@snapshot-labs/snapshot-sentry';
import snapshot from '@snapshot-labs/snapshot.js';
import log from '../log';
import vote from './vote';

const REFRESH_INTERVAL = 60 * 1000;

// One tick function per point source, each returns true when more work is pending
const sources = [vote];

export default async function run() {
  while (true) {
    let hasMoreWork = false;

    // A failing source only loses its own cycle; the others still run
    for (const source of sources) {
      try {
        hasMoreWork = (await source()) || hasMoreWork;
      } catch (err) {
        capture(err);
        log.error(`[points] failed to process, ${JSON.stringify(err)}`);
      }
    }

    if (!hasMoreWork) {
      log.info('[points] sleeping');
      await snapshot.utils.sleep(REFRESH_INTERVAL);
    }
  }
}
