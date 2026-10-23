/**
 * Runs a tally check in a Web Worker, with progress updates and `cancel()`.
 * Cancelling terminates the worker; the check has no side effects to undo.
 *
 * If `Worker` is not defined (some test environments), it runs on the main thread
 * instead. The result is the same, but the page blocks while it runs.
 */

import { verifyAll, VerifyAllResult, VerifyProgress } from './teVerify';
import { VerifyWorkerMessage, VerifyWorkerRequest } from './teVerifyWorker';

// `result` rejects with this when `cancel()` is called, so callers can tell a
// cancel from a failed check.
export class VerifyCancelled extends Error {
  constructor() {
    super('verification cancelled');
    this.name = 'VerifyCancelled';
  }
}

export interface VerifyRun {
  result: Promise<VerifyAllResult>;
  cancel: () => void;
}

export function runVerify(
  request: VerifyWorkerRequest,
  onProgress?: (p: VerifyProgress) => void
): VerifyRun {
  if (typeof Worker === 'undefined') {
    // The main-thread run cannot be interrupted; the flag only turns its result
    // into `VerifyCancelled` if the caller cancelled meanwhile.
    let cancelled = false;
    return {
      result: verifyAll(request, onProgress).then(r => {
        if (cancelled) throw new VerifyCancelled();
        return r;
      }),
      cancel: () => {
        cancelled = true;
      }
    };
  }

  // `type: 'module'` is required because Vite's dev server serves workers as ES
  // modules; a classic worker fails there with "Cannot use import statement outside
  // a module".
  //
  // The production build still emits an IIFE worker (Vite's `worker.format`
  // default). So the SDK loads BLST from `/blst.js` differently: in dev with fetch +
  // indirect eval, in production with `importScripts`. This is intended: production
  // does not need `script-src 'unsafe-eval'` in the CSP.
  const worker = new Worker(new URL('./teVerifyWorker.ts', import.meta.url), {
    type: 'module'
  });

  let settled = false;
  let rejectRun: ((err: Error) => void) | null = null;
  const result = new Promise<VerifyAllResult>((resolve, reject) => {
    rejectRun = reject;
    worker.onmessage = (event: MessageEvent<VerifyWorkerMessage>) => {
      const msg = event.data;
      if (msg.type === 'progress') {
        onProgress?.(msg.progress);
        return;
      }
      settled = true;
      worker.terminate();
      if (msg.type === 'done') resolve(msg.result);
      else reject(new Error(msg.message));
    };
    worker.onerror = err => {
      settled = true;
      worker.terminate();
      reject(new Error(err.message || 'verification worker failed'));
    };
  });

  worker.postMessage(request);

  return {
    result,
    cancel: () => {
      if (settled) return;
      settled = true;
      worker.terminate();
      rejectRun?.(new VerifyCancelled());
    }
  };
}
