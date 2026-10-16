/**
 * Run an audit off the main thread, with progress and a way out.
 *
 * Returns the promise plus a `cancel()`, because an audit is long enough that
 * "wait or reload the page" is not an acceptable pair of options. Cancelling
 * terminates the worker outright: the computation is pure and holds no locks or
 * partial writes, so there is nothing to unwind.
 *
 * Falls back to running on the main thread where `Worker` is unavailable — some
 * test environments, and any browser that fails to construct one. The fallback
 * computes exactly the same answer from the same code; it just blocks while it
 * does, so it is a correctness fallback rather than a supported mode.
 */

import { verifyAll, VerifyAllResult, VerifyProgress } from './teVerify';
import { VerifyWorkerMessage, VerifyWorkerRequest } from './teVerifyWorker';

/**
 * Thrown into `result` when `cancel()` is called.
 *
 * A distinct type rather than a plain error, and rather than leaving the promise
 * pending: a caller must be able to tell "the user stopped this" from "the audit
 * failed", because only one of those is worth showing as a problem — and a promise
 * that never settles is a leak the caller cannot clean up after.
 */
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
    // The fallback owns the thread until it returns, so there is nothing to
    // interrupt; the flag only stops a late resolve from being reported after the
    // caller has already moved on.
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

  // `type: 'module'` is required, not preferred: Vite's dev server always serves a
  // worker entry through its ESM pipeline, so a classic worker there dies with
  // "Cannot use import statement outside a module" no matter what `build` emits.
  //
  // The production build still emits an IIFE (Vite's `worker.format` default), so
  // the two environments genuinely differ in how the SDK loads BLST from
  // `/blst.js` — an Emscripten glue script that assigns a global and therefore
  // cannot be `import()`ed. Dev takes the module-worker path (fetch + indirect
  // eval); production takes `importScripts`. Both are supported and covered by the
  // SDK's own tests, so the divergence is deliberate rather than an accident: dev
  // gets a working server, production keeps the CSP-safe path and does not require
  // `script-src 'unsafe-eval'`.
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
