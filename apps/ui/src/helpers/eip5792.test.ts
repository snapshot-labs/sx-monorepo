import { describe, expect, it, vi } from 'vitest';
import { hasAtomicBatchSupport } from './eip5792';

function makeProvider(response: unknown, error?: Error) {
  return {
    send: vi.fn(async () => {
      if (error) throw error;

      return response;
    })
  };
}

describe('hasAtomicBatchSupport', () => {
  it('returns true when atomic status is "supported"', async () => {
    const provider = makeProvider({
      '0x1': { atomic: { status: 'supported' } }
    });

    const result = await hasAtomicBatchSupport(provider as any, '0xabc', 1);

    expect(result).toBe(true);
    expect(provider.send).toHaveBeenCalledWith('wallet_getCapabilities', [
      '0xabc',
      ['0x1']
    ]);
  });

  it('returns true when atomic status is "ready"', async () => {
    const provider = makeProvider({
      '0x1': { atomic: { status: 'ready' } }
    });

    expect(await hasAtomicBatchSupport(provider as any, '0xabc', 1)).toBe(true);
  });

  it('returns false when atomic status is "unsupported"', async () => {
    const provider = makeProvider({
      '0x1': { atomic: { status: 'unsupported' } }
    });

    expect(await hasAtomicBatchSupport(provider as any, '0xabc', 1)).toBe(
      false
    );
  });

  it('returns false when capability key is missing', async () => {
    const provider = makeProvider({ '0x1': {} });

    expect(await hasAtomicBatchSupport(provider as any, '0xabc', 1)).toBe(
      false
    );
  });

  it('returns false when wallet rejects the RPC method', async () => {
    const provider = makeProvider(undefined, new Error('Method not found'));

    expect(await hasAtomicBatchSupport(provider as any, '0xabc', 1)).toBe(
      false
    );
  });
});
