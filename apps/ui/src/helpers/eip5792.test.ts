import { describe, expect, it, vi } from 'vitest';
import {
  Eip5792Call,
  hasAtomicBatchSupport,
  sendBatchedCalls,
  waitForCallsBundle
} from './eip5792';

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

  it('returns true when atomic is a JSON-encoded string (Safe Wallet format)', async () => {
    const provider = makeProvider({
      '0x1': { atomic: '{"status":"supported"}' }
    });

    expect(await hasAtomicBatchSupport(provider as any, '0xabc', 1)).toBe(true);
  });

  it('returns true when capability uses legacy atomicBatch.supported (Safe iframe)', async () => {
    const provider = makeProvider({
      '0x1': { atomicBatch: { supported: true } }
    });

    expect(await hasAtomicBatchSupport(provider as any, '0xabc', 1)).toBe(true);
  });

  it('returns false when legacy atomicBatch.supported is false', async () => {
    const provider = makeProvider({
      '0x1': { atomicBatch: { supported: false } }
    });

    expect(await hasAtomicBatchSupport(provider as any, '0xabc', 1)).toBe(
      false
    );
  });

  it('returns false when atomic is an unparseable string', async () => {
    const provider = makeProvider({
      '0x1': { atomic: 'not json' }
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

describe('sendBatchedCalls', () => {
  it('sends wallet_sendCalls with hex chain id and returns the bundle id', async () => {
    const provider = makeProvider({ id: '0xBUNDLE' });

    const calls: Eip5792Call[] = [
      { to: '0xToken', data: '0xapprove' },
      { to: '0xPay', data: '0xpay' }
    ];

    const bundleId = await sendBatchedCalls(
      provider as any,
      '0xACCOUNT',
      1,
      calls
    );

    expect(bundleId).toBe('0xBUNDLE');
    expect(provider.send).toHaveBeenCalledWith('wallet_sendCalls', [
      {
        version: '2.0.0',
        chainId: '0x1',
        from: '0xACCOUNT',
        atomicRequired: true,
        calls
      }
    ]);
  });

  it('accepts a string bundle id (legacy wallet shape)', async () => {
    const provider = makeProvider('0xLEGACY');

    const bundleId = await sendBatchedCalls(
      provider as any,
      '0xACCOUNT',
      1,
      []
    );

    expect(bundleId).toBe('0xLEGACY');
  });
});

describe('waitForCallsBundle', () => {
  it('polls until status is CONFIRMED and returns the first tx hash', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ status: 100, receipts: [] })
      .mockResolvedValueOnce({
        status: 200,
        receipts: [{ transactionHash: '0xTX1' }, { transactionHash: '0xTX2' }]
      });

    const hash = await waitForCallsBundle({ send } as any, '0xBUNDLE', {
      pollIntervalMs: 0
    });

    expect(hash).toBe('0xTX1');
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith('wallet_getCallsStatus', ['0xBUNDLE']);
  });

  it('throws when status indicates failure', async () => {
    const send = vi.fn().mockResolvedValue({ status: 500, receipts: [] });

    await expect(
      waitForCallsBundle({ send } as any, '0xBUNDLE', { pollIntervalMs: 0 })
    ).rejects.toThrow(/failed.*500/i);
  });

  it('throws when status is 3xx (partial revert)', async () => {
    const send = vi.fn().mockResolvedValue({ status: 300, receipts: [] });

    await expect(
      waitForCallsBundle({ send } as any, '0xBUNDLE', { pollIntervalMs: 0 })
    ).rejects.toThrow(/failed.*300/i);
  });
});
