import { describe, expect, test } from 'bun:test';
import { createLoop } from './loop';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('createLoop', () => {
  test('runs the tick repeatedly until stopped', async () => {
    let ticks = 0;
    const loop = createLoop(async () => {
      ticks++;
    }, 1);

    loop.start();
    await wait(20);
    loop.stop();

    const afterStop = ticks;
    expect(afterStop).toBeGreaterThan(1);

    await wait(10);
    expect(ticks).toBe(afterStop);
  });

  test('keeps running after a tick throws', async () => {
    let ticks = 0;
    const loop = createLoop(async () => {
      ticks++;
      throw new Error('boom');
    }, 1);

    loop.start();
    await wait(20);
    loop.stop();

    expect(ticks).toBeGreaterThan(1);
  });

  test('does not overlap ticks', async () => {
    let running = 0;
    let overlapped = false;
    const loop = createLoop(async () => {
      running++;
      if (running > 1) overlapped = true;
      await wait(5);
      running--;
    }, 1);

    loop.start();
    await wait(30);
    loop.stop();

    expect(overlapped).toBe(false);
  });

  test('ignores start on a running loop', async () => {
    let ticks = 0;
    const loop = createLoop(async () => {
      ticks++;
      await wait(10);
    }, 1);

    loop.start();
    loop.start();
    await wait(5);
    loop.stop();

    expect(ticks).toBe(1);
  });
});
