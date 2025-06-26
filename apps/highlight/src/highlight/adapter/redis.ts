import { createClient, RedisClientType } from 'redis';
import { Adapter, Multi } from './adapter';

class RedisMulti extends Multi {
  private client: RedisClientType;
  private multi: ReturnType<RedisClientType['multi']>;

  constructor({ client }: { client: RedisClientType }) {
    super();
    this.client = client;
    this.multi = this.client.multi();
  }

  set(key: string, value: any) {
    this.multi.set(key, JSON.stringify(value));
  }

  del(key: string) {
    this.multi.del(key);
  }

  incr(key: string) {
    this.multi.incr(key);
  }

  async exec() {
    await this.multi.exec();
  }
}

export class RedisAdapter extends Adapter {
  private url: string;
  private client: RedisClientType;

  constructor({ url }: { url: string }) {
    super();
    this.url = url;
    this.client = createClient({ url: this.url });

    this.client.on('connect', () => console.log('Redis connect'));
    this.client.on('ready', () => console.log('Redis ready'));
    this.client.on('reconnecting', e => console.log('Redis reconnecting', e));
    this.client.on('error', e => console.log('Redis error', e));
    this.client.on('end', e => console.log('Redis end', e));
    this.client.connect().then(() => console.log('Redis connected'));

    setInterval(() => {
      this.client
        .set('heartbeat', ~~(Date.now() / 1e3))
        .catch(e => console.log('Redis heartbeat failed', e));
    }, 10e3);
  }

  async set(key: string, value: any) {
    await this.client.set(key, JSON.stringify(value));
  }

  async get(key: string) {
    const value = await this.client.get(key);

    return JSON.parse(value as string);
  }

  async mget(keys: string[]) {
    const values = await this.client.mGet(keys);

    return values.map(value => JSON.parse(value as string));
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async incr(key: string) {
    await this.client.incr(key);
  }

  async reset() {
    await this.client.flushAll();
  }

  multi() {
    return new RedisMulti({ client: this.client });
  }
}
