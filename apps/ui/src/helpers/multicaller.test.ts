import { Provider } from '@ethersproject/providers';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Multicaller from './multicaller';

vi.mock('@/helpers/call', () => ({
  multicall3: vi.fn(async (_provider, _abi, calls: unknown[]) =>
    calls.map(() => [true, ['value']])
  )
}));

describe('Multicaller', () => {
  afterEach(() => {
    delete (Object.prototype as any).polluted;
  });

  it('should nest results by path', async () => {
    const multi = new Multicaller('1', {} as Provider, []);
    multi.call('0xabc.name', '0xabc', 'name');
    multi.call('decimals', '0xabc', 'decimals');

    expect(await multi.execute()).toEqual({
      '0xabc': { name: 'value' },
      decimals: 'value'
    });
  });

  it.each([
    '__proto__.polluted',
    'constructor.prototype.polluted',
    'a.__proto__.polluted'
  ])('should not pollute Object.prototype with path %s', async path => {
    const multi = new Multicaller('1', {} as Provider, []);
    multi.call(path, '0xabc', 'name');
    await multi.execute();

    expect(({} as any).polluted).toBeUndefined();
  });
});
