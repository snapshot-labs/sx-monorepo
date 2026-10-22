/**
 * Web Worker that runs `verifyAll` for the "Verify tally" panel.
 *
 * A check can take tens of seconds, so it runs off the main thread: the page stays
 * responsive and the user can cancel it. The payloads arrive already fetched; this
 * worker makes no network requests.
 *
 * It sends `progress` messages, then exactly one `done` or `error`. Tallies are
 * sent as `bigint`, so totals above 2^53 stay exact.
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
