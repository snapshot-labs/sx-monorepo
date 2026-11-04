import { availableParallelism } from 'node:os';
import { extname, join } from 'node:path';
import { Worker } from 'node:worker_threads';
import {
  BallotInputs,
  BallotVerifyParams,
  VerifyResult
} from '@shutter-network/urban-verified-crypto';
import log from './log';

/**
 * A pool of worker threads for `verifyBallot`, so checking a private ballot does
 * not block the thread that serves requests.
 *
 * Each worker checks one ballot at a time; a job goes to the worker with the
 * fewest waiting. A worker that crashes fails only its own jobs, and a new one
 * starts when the next job is given to its slot.
 */

interface Job {
  inputs: BallotInputs;
  params: BallotVerifyParams;
  mpk: Uint8Array;
  eligibilityKey: Uint8Array;
}

interface Slot {
  /** `null` until a job needs it, and after a crash. */
  worker: Worker | null;
  pending: Map<
    number,
    { resolve: (r: VerifyResult) => void; reject: (e: Error) => void }
  >;
}

// The worker is a sibling file: `.ts` when run from source (Bun, Jest), `.js`
// when run from the compiled build.
const WORKER_FILE = join(__dirname, `teBallotWorker${extname(__filename)}`);

let slots: Slot[] | null = null;
let nextId = 0;

function poolSize(): number {
  const configured = Number(process.env.TE_VERIFY_WORKERS);
  if (Number.isInteger(configured) && configured > 0) return configured;
  // Leave one core for the thread that serves requests.
  return Math.max(1, availableParallelism() - 1);
}

function spawn(slot: Slot): Worker {
  const worker = new Worker(WORKER_FILE);
  // Never keeps the process alive on its own.
  worker.unref();
  slot.worker = worker;

  worker.on('message', ({ id, result, error }) => {
    const job = slot.pending.get(id);
    if (!job) return;
    slot.pending.delete(id);
    if (error !== undefined) job.reject(new Error(error));
    else job.resolve(result);
  });
  // Not restarted here: a worker that cannot start (a missing file, WASM that
  // will not load) would otherwise be restarted in a loop, forever.
  const fail = (err: Error) => {
    if (slot.worker !== worker) return;
    slot.worker = null;
    log.error(`[te-pool] ballot verifier stopped: ${err.message}`);
    for (const job of slot.pending.values()) job.reject(err);
    slot.pending.clear();
  };
  worker.on('error', fail);
  worker.on('exit', code => {
    if (code !== 0) fail(new Error(`ballot verifier exited with code ${code}`));
  });
  return worker;
}

export function verifyBallotInWorker(job: Job): Promise<VerifyResult> {
  if (!slots) {
    slots = Array.from({ length: poolSize() }, () => ({
      worker: null,
      pending: new Map()
    }));
  }
  // At most two checks per worker, running or waiting, so an accepted ballot waits
  // about two checks at most; past that, refuse at once instead of queueing.
  const inFlight = slots.reduce((n, s) => n + s.pending.size, 0);
  if (inFlight >= 2 * slots.length) {
    return Promise.resolve({
      ok: false,
      reason: 'sequencer_busy'
    } as VerifyResult);
  }
  const slot = slots.reduce((a, b) =>
    b.pending.size < a.pending.size ? b : a
  );
  const worker = slot.worker ?? spawn(slot);
  const id = nextId++;
  return new Promise((resolve, reject) => {
    slot.pending.set(id, { resolve, reject });
    worker.postMessage({ id, ...job });
  });
}

/** For tests: stop every worker; the next call starts a new pool. */
export async function closeBallotPool(): Promise<void> {
  const current = slots ?? [];
  slots = null;
  await Promise.all(
    current.map(slot => {
      // Emptied first, so the exit is not treated as a crash.
      const worker = slot.worker;
      slot.worker = null;
      return worker?.terminate();
    })
  );
}
