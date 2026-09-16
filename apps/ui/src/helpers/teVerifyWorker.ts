/**
 * Web Worker entry point for a private-tally audit.
 *
 * A thin wrapper over `verifyAll` and nothing else: no fetching, no policy, no
 * duplicated crypto. The payloads arrive already fetched so this module never
 * touches the network, which keeps the trust story identical to running it on the
 * main thread — the same code verifies the same bytes, just not on the thread
 * that paints.
 *
 * It exists because the work is genuinely long. Decompressing one ciphertext
 * costs ~2.8 ms in this WASM build, and a 1,000-ballot 5-choice proposal has
 * 10,000 of them, so an audit is tens of seconds of solid computation. On the main
 * thread that is a frozen tab with no way out; here it is a progress bar the user
 * can cancel by terminating the worker.
 *
 * Messages out are either `{ type: 'progress' }` or exactly one terminal
 * `{ type: 'done' }` / `{ type: 'error' }`. `bigint` survives structured cloning,
 * so tallies cross the boundary as exact integers rather than being stringified
 * and re-parsed — which matters, because a tally can exceed 2^53.
 */

import {
  AuditPayload,
  BallotsPayload,
  verifyAll,
  VerifyAllResult,
  VerifyProgress
} from './teVerify';

export interface VerifyWorkerRequest {
  proposalId: string;
  payload: AuditPayload;
  ballotsPayload: BallotsPayload;
  budget: number;
}

export type VerifyWorkerMessage =
  | { type: 'progress'; progress: VerifyProgress }
  | { type: 'done'; result: VerifyAllResult }
  | { type: 'error'; message: string };

self.onmessage = async (event: MessageEvent<VerifyWorkerRequest>) => {
  try {
    const result = await verifyAll(event.data, progress => {
      const msg: VerifyWorkerMessage = { type: 'progress', progress };
      self.postMessage(msg);
    });
    const msg: VerifyWorkerMessage = { type: 'done', result };
    self.postMessage(msg);
  } catch (err: any) {
    const msg: VerifyWorkerMessage = {
      type: 'error',
      message: err?.message || String(err)
    };
    self.postMessage(msg);
  }
};
