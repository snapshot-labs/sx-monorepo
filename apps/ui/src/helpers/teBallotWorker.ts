/**
 * Web Worker that builds the encrypted ballot for a private vote.
 *
 * A weighted ballot takes seconds to tens of seconds to build, so it runs off the
 * main thread and the page stays responsive. The page has already requested the
 * credential; this worker makes no network requests.
 */

import {
  BallotBuildRequest,
  BallotWorkerMessage,
  buildBallotFromRequest
} from './teBallot';

self.onmessage = async (event: MessageEvent<BallotBuildRequest>) => {
  let msg: BallotWorkerMessage;
  try {
    msg = { type: 'done', ballot: await buildBallotFromRequest(event.data) };
  } catch (err: any) {
    msg = { type: 'error', message: err?.message || String(err) };
  }
  self.postMessage(msg);
};
