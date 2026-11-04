import { describe, expect, it, vi } from 'vitest';

const initCurves = vi.hoisted(() => vi.fn());
vi.mock('@shutter-network/urban-verified-crypto', async importOriginal => ({
  ...(await importOriginal<object>()),
  initCurves
}));

describe('ensureCurvesInit', () => {
  // A failed `/blst.js` load must not be cached, or every later vote fails until
  // the page is reloaded.
  it('tries again after a failed load', async () => {
    const { ensureCurvesInit } = await import('./teBallot');
    initCurves.mockRejectedValueOnce(new Error('blst.js failed to load'));
    initCurves.mockResolvedValueOnce(undefined);

    await expect(ensureCurvesInit()).rejects.toThrow('blst.js failed to load');
    await expect(ensureCurvesInit()).resolves.toBeUndefined();
    expect(initCurves).toHaveBeenCalledTimes(2);

    // And a successful load is still kept.
    await ensureCurvesInit();
    expect(initCurves).toHaveBeenCalledTimes(2);
  });
});
