/**
 * Worker thread for `verifyBallot`, the full check of a private ballot. It takes
 * seconds of synchronous WASM per ballot, so it must not run on the main thread.
 * It has no sequencer imports, so it loads under Bun, Node and Jest.
 *
 * Uses `require`, not `import`: with `import`, Node would load this `.ts` file as
 * an ES module and use the SDK's ESM build, which cannot load its WASM here.
 */

/* eslint-disable @typescript-eslint/no-require-imports -- must stay CommonJS, see above */
const { parentPort } = require('node:worker_threads');
const sdk = require('@shutter-network/urban-verified-crypto');
/* eslint-enable @typescript-eslint/no-require-imports */

const ready = sdk.initCurves();

parentPort.on(
  'message',
  async ({ id, inputs, params, mpk, eligibilityKey }) => {
    try {
      await ready;
      const point = sdk.G2Point.fromBytes(mpk);
      try {
        parentPort.postMessage({
          id,
          result: sdk.verifyBallot(inputs, params, point, eligibilityKey)
        });
      } finally {
        point.destroyWasm();
      }
    } catch (err: any) {
      parentPort.postMessage({ id, error: err?.message || String(err) });
    }
  }
);
