import logger from './logger';

type Loop = {
  start: () => void;
  stop: () => void;
};

/**
 * Runs `onTick` on an interval. The next run is scheduled once the previous
 * one settles, so a slow tick delays the loop rather than overlapping with
 * itself, and a throwing tick does not stop it.
 */
export function createLoop(
  onTick: () => Promise<void>,
  intervalMs: number
): Loop {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  async function run(): Promise<void> {
    try {
      await onTick();
    } catch (err) {
      logger.error({ err }, 'tick failed');
    }

    if (running) timer = setTimeout(run, intervalMs);
  }

  return {
    start() {
      if (running) return;
      running = true;
      void run();
    },
    stop() {
      running = false;
      if (timer) clearTimeout(timer);
      timer = null;
    }
  };
}
