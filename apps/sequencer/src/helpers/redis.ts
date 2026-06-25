import { createClient } from 'redis';
import log from './log';

let client;

(async () => {
  if (!process.env.RATE_LIMIT_DATABASE_URL) return;

  log.info('[redis] Connecting to Redis');
  client = createClient({ url: process.env.RATE_LIMIT_DATABASE_URL });
  client.on('connect', () => log.info('[redis] Redis connect'));
  client.on('ready', () => log.info('[redis] Redis ready'));
  client.on('reconnecting', err => log.info('[redis] Redis reconnecting', err));
  client.on('error', err => log.info('[redis] Redis error', err));
  client.on('end', err => log.info('[redis] Redis end', err));
  await client.connect();
})();

export default client;
