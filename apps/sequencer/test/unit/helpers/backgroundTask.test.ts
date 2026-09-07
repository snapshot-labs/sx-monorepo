/** @jest-environment node */

import { execFileSync } from 'child_process';
import { resolve } from 'path';
import { capture } from '@snapshot-labs/snapshot-sentry';
import startBackgroundTask from '../../../src/helpers/backgroundTask';

jest.mock('@snapshot-labs/snapshot-sentry', () => ({ capture: jest.fn() }));

describe('background task recovery', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('survives task and cache failures with real Sentry v4 enabled', () => {
    const output = execFileSync(
      process.execPath,
      [
        '-r',
        'ts-node/register/transpile-only',
        '-e',
        `
      const assert = require('node:assert/strict');
      const { initLogger } = require('@snapshot-labs/snapshot-sentry');
      // Ignore only delivery of the synthetic error, not strict rejection handling.
      initLogger({ ignoreErrors: ['expected retry'] });
      const startBackgroundTask = require('./src/helpers/backgroundTask').default;
      require.cache[require.resolve('./src/helpers/mysql')] = {
        exports: { __esModule: true, default: { queryAsync: async () => [] } }
      };
      let cacheAttempts = 0;
      require.cache[require.resolve('./src/helpers/utils')] = {
        exports: {
          jsonParse: JSON.parse,
          clearStampCache: async () => {
            cacheAttempts++;
            throw new Error('expected retry');
          }
        }
      };
      require('./src/writer/profile').action({
        from: '0x123', timestamp: 1,
        profile: JSON.stringify({ name: 'updated', avatar: 'ipfs://avatar' })
      }, 'ipfs');
      let attempts = 0;
      const stop = startBackgroundTask('test', async () => {
        attempts++;
        if (attempts === 1) throw new Error('expected retry');
      }, 10);
      setTimeout(() => {
        stop();
        assert.equal(attempts, 2);
        assert.equal(cacheAttempts, 2);
        console.log('survived');
        process.exit(0);
      }, 100);
    `
      ],
      {
        cwd: resolve(__dirname, '../../..'),
        env: {
          ...process.env,
          NODE_ENV: 'production',
          SENTRY_DSN: 'https://public@example.invalid/1'
        },
        encoding: 'utf8',
        timeout: 10000
      }
    );
    expect(output).toContain('survived');
  });

  it('reports a rejected task and retries only after the delay', async () => {
    const err = new Error('MySQL connection lost');
    const task = jest
      .fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValue(undefined);
    const stop = startBackgroundTask('votes', task);
    await jest.advanceTimersByTimeAsync(9999);
    expect(capture).toHaveBeenCalledWith(err, { tags: { task: 'votes' } });
    expect(task).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(task).toHaveBeenCalledTimes(2);
    stop();
  });

  it('does not overlap an in-flight task', async () => {
    const task = jest.fn(() => new Promise<void>(() => {}));
    const stop = startBackgroundTask('votes', task);
    await jest.advanceTimersByTimeAsync(30000);
    expect(task).toHaveBeenCalledTimes(1);
    stop();
  });

  it('keeps retries delayed across repeated failures', async () => {
    const task = jest.fn().mockRejectedValue(new Error('Database unavailable'));
    const stop = startBackgroundTask('votes', task);
    await jest.advanceTimersByTimeAsync(20000);
    expect(task).toHaveBeenCalledTimes(3);
    stop();
  });

  it('cancels a scheduled retry on shutdown', async () => {
    const task = jest.fn().mockRejectedValue(new Error('Database unavailable'));
    const stop = startBackgroundTask('votes', task);
    await jest.advanceTimersByTimeAsync(0);
    stop();
    await jest.advanceTimersByTimeAsync(10000);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('does not retry an in-flight task that rejects after shutdown', async () => {
    let rejectTask: (err: Error) => void = () => {};
    const task = jest.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectTask = reject;
        })
    );
    const stop = startBackgroundTask('votes', task);
    stop();
    rejectTask(new Error('Database unavailable'));
    await jest.advanceTimersByTimeAsync(10000);
    expect(task).toHaveBeenCalledTimes(1);
  });
});
