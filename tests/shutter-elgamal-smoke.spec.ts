import { expect, test } from '@playwright/test';

/**
 * Smoke test for the Phase 5–8 shutter-elgamal UI changes.
 *
 * We can't run a true end-to-end vote here (would need a running hub +
 * sequencer + 3 keypers + a seeded shutter-elgamal proposal), but we
 * CAN verify:
 *
 * 1. The dev build serves and the homepage renders without console
 *    errors. This catches any import/syntax breakage in the modules
 *    Phase 5–8 touched (offchain/index.ts, ProposalResults.vue, etc.).
 * 2. The vendored SDK's BLST WASM loader (apps/ui/public/blst.{js,wasm})
 *    is reachable and serves with the right MIME type — without it,
 *    `buildBallot` would fail at runtime.
 * 3. The compiled JS bundle imports include the new
 *    `shutter-elgamal` privacy enum value (Phase 7 SelectPrivacy.vue
 *    + Phase 1 PRIVACY_TYPES_INFO).
 */
test.describe('shutter-elgamal smoke', () => {
  test('homepage loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });

    const resp = await page.goto('/');
    expect(resp?.status()).toBeLessThan(400);
    // App.vue replaces the static "Snapshot" title with the route name
    // once Vue mounts, so accept either.
    await expect(page).toHaveTitle(/snapshot|explore/i);

    // Allow a tick for async vue mount + module imports to settle.
    await page.waitForLoadState('networkidle');

    // SDK-related imports are dynamic; pageerror would fire if any
    // of them failed to resolve under the new bundle.
    // Ignore failures from missing graphql-codegen artifacts and any
    // upstream snapshot.org API hits — those are environmental and
    // unrelated to Phase 5–8 changes. We're only catching errors from
    // OUR new modules failing to import or evaluate.
    const ignored = (e: string) =>
      e.includes('GraphQL') ||
      e.includes('fetch') ||
      e.includes('Failed to load resource') ||
      e.includes('./gql');
    expect(errors.filter(e => !ignored(e))).toEqual([]);
  });

  test('blst WASM is served from /public', async ({ request }) => {
    const wasm = await request.get('/blst.wasm');
    expect(wasm.status()).toBe(200);
    expect(wasm.headers()['content-type']).toMatch(/wasm|octet-stream/);
    const js = await request.get('/blst.js');
    expect(js.status()).toBe(200);
    expect(js.headers()['content-type']).toMatch(/javascript/);
  });

  test('bundle exposes shutter-elgamal privacy strings', async ({ page }) => {
    const resp = await page.goto('/');
    expect(resp?.status()).toBeLessThan(400);
    // The PRIVACY_TYPES_INFO map (Phase 1) and the SelectPrivacy enum
    // (Phase 7) both ship the literal "shutter-elgamal" string.
    // Vite serves modules as separate JS files in dev; checking the
    // top-level HTML is not enough. Walk the network: read every JS
    // module the page fetches, fail if none mention the literal.
    const seenInBundle = await page.evaluate(async () => {
      const entries = performance.getEntriesByType(
        'resource'
      ) as PerformanceResourceTiming[];
      const jsUrls = entries
        .map(e => e.name)
        .filter(u => /\.(ts|tsx|vue|js)\??/.test(u))
        .filter(u => u.startsWith(window.location.origin));
      const found: string[] = [];
      for (const u of jsUrls) {
        try {
          const r = await fetch(u);
          if (!r.ok) continue;
          const text = await r.text();
          if (text.includes('shutter-elgamal')) found.push(u);
        } catch {
          /* ignore */
        }
      }
      return found.length;
    });
    expect(seenInBundle).toBeGreaterThan(0);
  });
});
