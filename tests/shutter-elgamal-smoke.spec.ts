import { expect, test } from '@playwright/test';

/**
 * Smoke test for the shutter-elgamal UI. A real vote needs a hub, sequencer,
 * 3 keypers and a seeded proposal, so this only checks that the BLST WASM loader
 * (apps/ui/public/blst.{js,wasm}, copied at install) is served with the right
 * MIME type; `buildBallot` fails at runtime without it.
 */
test.describe('shutter-elgamal smoke', () => {
  test('blst WASM is served from /public', async ({ request }) => {
    const wasm = await request.get('/blst.wasm');
    expect(wasm.status()).toBe(200);
    expect(wasm.headers()['content-type']).toMatch(/wasm|octet-stream/);
    const js = await request.get('/blst.js');
    expect(js.status()).toBe(200);
    expect(js.headers()['content-type']).toMatch(/javascript/);
  });
});
