/**
 * A ballot worker that cannot start (a missing file, WASM that will not load) must
 * not be restarted in a loop: that burned a CPU core forever without a log line.
 * Each failure now fails one ballot, and a new worker starts only for the next one.
 */

import { EventEmitter } from 'node:events';
import {
  closeBallotPool,
  verifyBallotInWorker
} from '../../../src/helpers/teBallotPool';

const mockStarted: unknown[] = [];
jest.mock('node:worker_threads', () => ({
  Worker: class extends EventEmitter {
    constructor() {
      super();
      mockStarted.push(this);
      setImmediate(() => this.emit('error', new Error('cannot load BLST')));
    }

    unref() {}

    postMessage() {}

    terminate() {
      return Promise.resolve(0);
    }
  }
}));

const job = {
  inputs: {},
  params: {},
  mpk: new Uint8Array(),
  eligibilityKey: new Uint8Array()
} as any;

beforeAll(() => {
  process.env.TE_VERIFY_WORKERS = '1';
});

afterAll(async () => {
  delete process.env.TE_VERIFY_WORKERS;
  await closeBallotPool();
});

it('starts a new worker only when the next ballot needs one', async () => {
  await expect(verifyBallotInWorker(job)).rejects.toThrow('cannot load BLST');
  // Long enough for a restart loop to start hundreds of workers.
  await new Promise(resolve => setTimeout(resolve, 100));
  expect(mockStarted).toHaveLength(1);

  await expect(verifyBallotInWorker(job)).rejects.toThrow('cannot load BLST');
  expect(mockStarted).toHaveLength(2);
});
