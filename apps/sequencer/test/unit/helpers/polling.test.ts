/** @jest-environment node */

import { execFileSync } from 'child_process';
import { resolve } from 'path';
import { capture } from '@snapshot-labs/snapshot-sentry';
import snapshot from '@snapshot-labs/snapshot.js';
import deleteProposalVotes from '../../../src/helpers/deleteProposalVotes';
import { getVpValueByStrategy } from '../../../src/helpers/entityValue';
import refreshModeration from '../../../src/helpers/moderation';
import db from '../../../src/helpers/mysql';
import refreshProposalsScoresValue from '../../../src/helpers/proposalsScoresValue';
import refreshProposalsVpValue from '../../../src/helpers/proposalStrategiesValue';
import { fetchWithKeepAlive } from '../../../src/helpers/utils';
import refreshVotesVpValue from '../../../src/helpers/votesVpValue';

jest.mock('@snapshot-labs/snapshot-sentry', () => ({ capture: jest.fn() }));
jest.mock('@snapshot-labs/snapshot.js', () => ({
  utils: { sleep: jest.fn() }
}));
jest.mock('../../../src/helpers/mysql', () => ({
  __esModule: true,
  default: { queryAsync: jest.fn() }
}));
jest.mock('../../../src/helpers/log', () => ({
  info: jest.fn(),
  error: jest.fn()
}));
jest.mock('../../../src/helpers/entityValue', () => ({
  getVpValueByStrategy: jest.fn()
}));
jest.mock('../../../src/helpers/utils', () => ({
  fetchWithKeepAlive: jest.fn()
}));

const queryAsync = db.queryAsync as jest.Mock;
const sleep = jest.mocked(snapshot.utils.sleep);

// Hold each loop at its next sleep without real timers or a database.
function pauseAtNextSleep() {
  let resume: () => void = () => {};
  const reached = new Promise<void>(notify => {
    sleep.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          resume = resolve;
          notify();
        })
    );
  });
  return { reached, resume: () => resume() };
}

describe('polling loop recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryAsync.mockReset().mockResolvedValue([]);
    sleep.mockReset();
    jest.mocked(getVpValueByStrategy).mockReset();
    jest.mocked(fetchWithKeepAlive).mockReset();
  });

  it.each([
    ['proposal values', refreshProposalsVpValue, 10000],
    ['proposal scores', refreshProposalsScoresValue, 10000],
    ['vote values', refreshVotesVpValue, 60000],
    ['vote deletion', deleteProposalVotes, 60000]
  ] as const)(
    '%s reports database errors and retries after its own interval',
    async (_name, run, interval) => {
      const err = new Error('MySQL connection lost');
      queryAsync.mockRejectedValueOnce(err);
      const paused = pauseAtNextSleep();
      const escaped = jest.fn();
      run().catch(escaped);
      await paused.reached;
      expect(capture).toHaveBeenCalledWith(err);
      expect(sleep).toHaveBeenCalledWith(interval);
      expect(queryAsync).toHaveBeenCalledTimes(1);
      const retried = pauseAtNextSleep();
      paused.resume();
      await retried.reached;
      expect(queryAsync.mock.calls.length).toBeGreaterThan(1);
      expect(escaped).not.toHaveBeenCalled();
    }
  );

  it('also catches a failure while writing a batch', async () => {
    const err = new Error('MySQL write failed');
    queryAsync
      .mockResolvedValueOnce([
        {
          id: 'proposal',
          scores_state: 'final',
          vp_value_by_strategy: '[1]',
          scores_by_strategy: '[[2]]'
        }
      ])
      .mockRejectedValueOnce(err);
    const paused = pauseAtNextSleep();
    const escaped = jest.fn();
    refreshProposalsScoresValue().catch(escaped);
    await paused.reached;
    expect(queryAsync).toHaveBeenCalledTimes(2);
    expect(capture).toHaveBeenCalledWith(err);
    expect(sleep).toHaveBeenCalledWith(10000);
    expect(escaped).not.toHaveBeenCalled();
  });

  it('preserves the one-minute strategy rate-limit backoff', async () => {
    queryAsync.mockResolvedValueOnce([
      {
        id: 'proposal',
        network: '1',
        start: 1,
        strategies: '[]'
      }
    ]);
    jest.mocked(getVpValueByStrategy).mockRejectedValueOnce({ status: 429 });
    const paused = pauseAtNextSleep();
    const escaped = jest.fn();
    refreshProposalsVpValue().catch(escaped);
    await paused.reached;
    expect(sleep).toHaveBeenCalledWith(60000);
    expect(capture).not.toHaveBeenCalled();
    expect(escaped).not.toHaveBeenCalled();
  });

  it('recovers from malformed moderation data on the next iteration', async () => {
    jest
      .mocked(fetchWithKeepAlive)
      .mockResolvedValueOnce({
        json: async () => ({ flaggedAddresses: [null] })
      })
      .mockResolvedValueOnce({ json: async () => ({ flaggedAddresses: [] }) });
    const paused = pauseAtNextSleep();
    const escaped = jest.fn();
    refreshModeration().catch(escaped);
    await paused.reached;
    expect(capture).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(20000);
    const retried = pauseAtNextSleep();
    paused.resume();
    await retried.reached;
    expect(fetchWithKeepAlive).toHaveBeenCalledTimes(2);
    expect(escaped).not.toHaveBeenCalled();
  });

  it('survives polling and cache failures with real Sentry v4 enabled', () => {
    const output = execFileSync(
      process.execPath,
      [
        '-r',
        'ts-node/register/transpile-only',
        '-e',
        `
      const assert = require('node:assert/strict');
      const { initLogger } = require('@snapshot-labs/snapshot-sentry');
      // Suppress event delivery, not strict unhandled-rejection handling.
      initLogger({ ignoreErrors: ['expected retry'] });
      let attempts = 0;
      require.cache[require.resolve('./src/helpers/mysql')] = {
        exports: { __esModule: true, default: { queryAsync: async sql => {
          if (sql.includes('scores_state') && ++attempts === 1) throw new Error('expected retry');
          return [];
        } } }
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
      const delays = [];
      require('@snapshot-labs/snapshot.js').utils.sleep = delay => {
        delays.push(delay);
        return new Promise(resolve => {
          if (delays.length === 1) setTimeout(resolve, 1);
        });
      };
      require('./src/writer/profile').action({
        from: '0x123', timestamp: 1,
        profile: JSON.stringify({ name: 'updated', avatar: 'ipfs://avatar' })
      }, 'ipfs');
      require('./src/helpers/proposalsScoresValue').default();
      setTimeout(() => {
        assert.equal(attempts, 2);
        assert.equal(cacheAttempts, 2);
        assert.deepEqual(delays, [10000, 10000]);
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
});
