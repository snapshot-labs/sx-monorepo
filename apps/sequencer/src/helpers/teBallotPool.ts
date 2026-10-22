import { availableParallelism } from 'node:os';
import { extname, join } from 'node:path';
import { Worker } from 'node:worker_threads';
import {
  BallotInputs,
  BallotVerifyParams,
  VerifyResult
} from '@shutter-network/urban-verified-crypto';

/**
 * A pool of worker threads for `verifyBallot`, so checking a private ballot does
 * not block the thread that serves requests.
 *
 * Each worker checks one ballot at a time; a job goes to the worker with the
 * fewest waiting. A worker that crashes fails only its own jobs and is replaced.
 */

interface Job {
  inputs: BallotInputs;
  params: BallotVerifyParams;
  mpk: Uint8Array;
  eligibilityKey: Uint8Array;
}

interface Slot {
  worker: Worker;
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

function spawn(slot?: Slot): Slot {
  const worker = new Worker(WORKER_FILE);
  // Never keeps the process alive on its own.
  worker.unref();
  const filled: Slot = slot ?? { worker, pending: new Map() };
  filled.worker = worker;

  worker.on('message', ({ id, result, error }) => {
    const job = filled.pending.get(id);
    if (!job) return;
    filled.pending.delete(id);
    if (error !== undefined) job.reject(new Error(error));
    else job.resolve(result);
  });
  const fail = (err: Error) => {
    if (filled.worker !== worker) return;
    for (const job of filled.pending.values()) job.reject(err);
    filled.pending.clear();
    spawn(filled);
  };
  worker.on('error', fail);
  worker.on('exit', code => {
    if (code !== 0) fail(new Error(`ballot verifier exited with code ${code}`));
  });
  return filled;
}

export function verifyBallotInWorker(job: Job): Promise<VerifyResult> {
  if (!slots) slots = Array.from({ length: poolSize() }, () => spawn());
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
  const id = nextId++;
  return new Promise((resolve, reject) => {
    slot.pending.set(id, { resolve, reject });
    slot.worker.postMessage({ id, ...job });
  });
}

/** For tests: stop every worker; the next call starts a new pool. */
export async function closeBallotPool(): Promise<void> {
  const current = slots;
  slots = null;
  await Promise.all((current ?? []).map(s => s.worker.terminate()));
}
