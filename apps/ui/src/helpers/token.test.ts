import { beforeEach, describe, expect, it, vi } from 'vitest';
import { approve } from './token';

const TOKEN = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const SPENDER = '0xE40BfEB5a3014c9b98597088cA71eccdc27Ca410';
const OWNER = '0xC2339fcbB6481C2Dc1f509b7A8cD7CE815f8FEC2';

// `approve` reads the current allowance and may send a reset transaction before
// the real one, so stub the contract rather than faking encoded responses.
const { allowanceMock, approveMock, waitMock } = vi.hoisted(() => ({
  allowanceMock: vi.fn(),
  approveMock: vi.fn(),
  waitMock: vi.fn()
}));

vi.mock('@ethersproject/contracts', () => ({
  Contract: vi.fn(() => ({
    allowance: allowanceMock,
    approve: approveMock
  }))
}));

function allowanceOf(value: bigint) {
  return { toBigInt: () => value };
}

const web3 = {
  getSigner: () => ({ getAddress: async () => OWNER })
} as any;

beforeEach(() => {
  allowanceMock.mockReset().mockResolvedValue(allowanceOf(0n));
  waitMock.mockReset().mockResolvedValue(undefined);
  approveMock.mockReset().mockResolvedValue({ hash: '0x1', wait: waitMock });
});

describe('approve', () => {
  it('approves directly when there is no leftover allowance', async () => {
    await approve(web3, TOKEN, SPENDER, 200n);

    expect(approveMock).toHaveBeenCalledTimes(1);
    expect(approveMock).toHaveBeenCalledWith(SPENDER, 200n);
  });

  it('clears a leftover allowance before approving a new amount', async () => {
    allowanceMock.mockResolvedValue(allowanceOf(50n));

    await approve(web3, TOKEN, SPENDER, 200n);

    expect(approveMock).toHaveBeenCalledTimes(2);
    expect(approveMock).toHaveBeenNthCalledWith(1, SPENDER, 0n);
    expect(approveMock).toHaveBeenNthCalledWith(2, SPENDER, 200n);
  });

  it('waits for the reset to be mined before approving', async () => {
    allowanceMock.mockResolvedValue(allowanceOf(50n));

    await approve(web3, TOKEN, SPENDER, 200n);

    expect(waitMock).toHaveBeenCalledTimes(1);
    expect(waitMock.mock.invocationCallOrder[0]).toBeLessThan(
      approveMock.mock.invocationCallOrder[1]
    );
  });

  it('returns the transaction of the requested amount', async () => {
    allowanceMock.mockResolvedValue(allowanceOf(50n));
    approveMock
      .mockResolvedValueOnce({ hash: '0xreset', wait: waitMock })
      .mockResolvedValueOnce({ hash: '0xapprove', wait: waitMock });

    const tx = await approve(web3, TOKEN, SPENDER, 200n);

    expect(tx.hash).toBe('0xapprove');
  });

  it('continues when the reset is sped up rather than cancelled', async () => {
    allowanceMock.mockResolvedValue(allowanceOf(50n));
    waitMock.mockRejectedValue(
      Object.assign(new Error('transaction was replaced'), {
        code: 'TRANSACTION_REPLACED',
        cancelled: false
      })
    );

    await expect(approve(web3, TOKEN, SPENDER, 200n)).resolves.toBeDefined();

    expect(approveMock).toHaveBeenNthCalledWith(2, SPENDER, 200n);
  });

  it('fails when the reset is cancelled, leaving the allowance set', async () => {
    allowanceMock.mockResolvedValue(allowanceOf(50n));
    waitMock.mockRejectedValue(
      Object.assign(new Error('transaction was cancelled'), {
        code: 'TRANSACTION_REPLACED',
        cancelled: true
      })
    );

    await expect(approve(web3, TOKEN, SPENDER, 200n)).rejects.toThrow(
      'transaction was cancelled'
    );

    expect(approveMock).toHaveBeenCalledTimes(1);
  });

  it('does not read the allowance when revoking', async () => {
    await approve(web3, TOKEN, SPENDER, 0n);

    expect(allowanceMock).not.toHaveBeenCalled();
    expect(approveMock).toHaveBeenCalledTimes(1);
    expect(approveMock).toHaveBeenCalledWith(SPENDER, 0n);
  });
});
