import { describe, expect, it, vi } from 'vitest';

/**
 * The client is plumbing around `verifyAll`, so `verifyAll` is stubbed here and
 * the assertions are about the contract the panel depends on: that cancelling is
 * observable and distinguishable from failure, that a cancelled run never leaves
 * a promise pending, and that progress is forwarded.
 *
 * `Worker` is undefined under vitest's node environment, so `runVerify` takes its
 * main-thread fallback path by construction — which is the path these cover. The
 * worker path is exercised in a browser; both call the same `verifyAll`.
 */
const verifyAll = vi.fn();
vi.mock('./teVerify', () => ({
  verifyAll: (...args: any[]) => verifyAll(...args)
}));

const { runVerify, VerifyCancelled } = await import('./teVerifyClient');

const request = {
  proposalId: `0x${'11'.repeat(32)}`,
  payload: {} as any,
  ballotsPayload: {} as any,
  budget: 1
};

describe('runVerify — main-thread fallback', () => {
  it('passes the result through when the run completes', async () => {
    verifyAll.mockResolvedValueOnce({
      ballots: 'B',
      tally: 'T',
      derivedBound: 7n
    });
    await expect(runVerify(request).result).resolves.toEqual({
      ballots: 'B',
      tally: 'T',
      derivedBound: 7n
    });
  });

  it('surfaces the underlying failure unchanged', async () => {
    verifyAll.mockRejectedValueOnce(new Error('boom'));
    await expect(runVerify(request).result).rejects.toThrow('boom');
  });

  it('rejects with VerifyCancelled — not a generic error — when cancelled', async () => {
    // The distinction matters: a cancelled audit is a user action, and surfacing
    // it as a failure would tell someone their tally is suspect when it is not.
    let finish: (v: unknown) => void = () => {};
    verifyAll.mockReturnValueOnce(new Promise(r => (finish = r)));
    const run = runVerify(request);
    run.cancel();
    finish({ ballots: 'B', tally: 'T', derivedBound: 1n });
    await expect(run.result).rejects.toBeInstanceOf(VerifyCancelled);
  });

  it('never leaves the promise pending after cancel', async () => {
    let finish: (v: unknown) => void = () => {};
    verifyAll.mockReturnValueOnce(new Promise(r => (finish = r)));
    const run = runVerify(request);
    run.cancel();
    finish({ ballots: 'B', tally: 'T', derivedBound: 1n });
    const settled = await Promise.race([
      run.result.then(
        () => 'resolved',
        () => 'rejected'
      ),
      new Promise(r => setTimeout(() => r('pending'), 1000))
    ]);
    expect(settled).toBe('rejected');
  }, 10_000);

  it('forwards progress to the caller', async () => {
    const onProgress = vi.fn();
    verifyAll.mockImplementationOnce(async (_req: any, cb: any) => {
      cb({ phase: 'aggregate', done: 128, total: 256 });
      cb({ phase: 'tally', done: 1, total: 1 });
      return { ballots: 'B', tally: 'T', derivedBound: 1n };
    });
    await runVerify(request, onProgress).result;
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenCalledWith({
      phase: 'aggregate',
      done: 128,
      total: 256
    });
  });
});
