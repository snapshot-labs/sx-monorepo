import { Adapter, Multi } from './adapter';

class MemoryMulti extends Multi {
  private adapter: Adapter;
  private actions: any[];

  constructor({ adapter }: { adapter: Adapter }) {
    super();
    this.adapter = adapter;
    this.actions = [];
  }

  set(key: string, value: any) {
    this.actions.push(['set', key, value]);
  }

  del(key: string) {
    this.actions.push(['del', key]);
  }

  incr(key: string) {
    this.actions.push(['incr', key]);
  }

  async exec() {
    this.actions.forEach(action => {
      if (action[0] === 'set') {
        this.adapter.set(action[1], action[2]);
      } else if (action[0] === 'del') {
        this.adapter.del(action[1]);
      } else if (action[0] === 'incr') {
        this.adapter.incr(action[1]);
      }
    });
    this.actions = [];
  }
}

export class MemoryAdapter extends Adapter {
  private state: Record<string, any> = {};

  async set(key: string, value: any) {
    this.state[key] = value;
  }

  async get(key: string) {
    return this.state[key] === undefined ? null : this.state[key];
  }

  async mget(keys: string[]) {
    return Promise.all(keys.map(key => this.get(key)));
  }

  async del(key: string) {
    delete this.state[key];
  }

  async incr(key: string) {
    if (this.state[key] === undefined) {
      this.state[key] = 0;
    }
    this.state[key]++;
  }

  async reset() {
    this.state = {};
  }

  multi() {
    return new MemoryMulti({ adapter: this });
  }
}
