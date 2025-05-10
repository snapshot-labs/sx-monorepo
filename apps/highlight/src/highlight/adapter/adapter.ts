/* eslint-disable @typescript-eslint/no-unused-vars */

export class Multi {
  set(key: string, value: any): void {
    throw new Error('set method was not defined');
  }

  del(key: string): void {
    throw new Error('del method was not defined');
  }

  incr(key: string) {
    throw new Error('incr method was not defined');
  }

  async exec(): Promise<void> {
    throw new Error('exec method was not defined');
  }
}

export class Adapter {
  async set(key: string, value: any): Promise<void> {
    throw new Error('set method was not defined');
  }

  async get(key: string): Promise<any> {
    throw new Error('get method was not defined');
  }

  async mget(keys: string[]): Promise<any> {
    throw new Error('mget method was not defined');
  }

  async del(key: string): Promise<void> {
    throw new Error('del method was not defined');
  }

  async incr(key: string): Promise<void> {
    throw new Error('incr method was not defined');
  }

  async reset(): Promise<void> {
    throw new Error('reset method was not defined');
  }

  multi(): Multi {
    throw new Error('reset method was not defined');
  }
}
