import logger from '../logger';
import { cast } from './cast';
import { plan } from './plan';
import { predict } from './predict';

export async function tick(): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  const planned = await plan(now);
  const predicted = await predict(now);
  const casted = await cast(now);

  logger.info({ planned, predicted, cast: casted }, 'tick done');
}
