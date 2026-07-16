import type { Blst } from './blst/types';
import { getBlst } from './get-blst';

let blstInstance: Blst | null = null;
let initPromise: Promise<void> | null = null;

export async function initCurves(): Promise<void> {
  if (blstInstance) return;
  if (!initPromise) {
    initPromise = (async () => {
      const blst = await getBlst();
      await new Promise<void>((resolve) => {
        if (blst.calledRun) resolve();
        else blst.onRuntimeInitialized = () => resolve();
      });
      blstInstance = blst as Blst;
    })();
  }
  await initPromise;
}

export function blst(): Blst {
  if (!blstInstance) {
    throw new Error(
      'BLST not initialised. Call `await initCurves()` once before using the curve layer.',
    );
  }
  return blstInstance;
}
