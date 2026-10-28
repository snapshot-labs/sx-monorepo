import { beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { startAuthFlow } from './helpers.js';
import { SnapshotOAuthProvider } from '../src/auth.js';
import * as cdp from '../src/cdp.js';
import logger from '../src/logger.js';

describe('authorize() surfaces CDP account-creation failures', () => {
  let provider: SnapshotOAuthProvider;

  beforeEach(() => {
    provider = new SnapshotOAuthProvider();
  });

  test('logs the CDP error with full fidelity, then rethrows it unchanged', async () => {
    const cdpError = Object.assign(new Error('Account limit exceeded'), {
      name: 'APIError',
      statusCode: 429,
      errorType: 'account_limit_exceeded',
      correlationId: 'corr-abc-123'
    });

    const createSpy = spyOn(cdp, 'createFreshAccount').mockRejectedValueOnce(cdpError);
    const logSpy = spyOn(logger, 'error').mockImplementation(() => undefined as never);

    await expect(startAuthFlow(provider)).rejects.toBe(cdpError);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const [fields, msg] = logSpy.mock.calls[0] as unknown as [{ err: unknown }, string];
    expect(fields.err).toBe(cdpError);
    expect(msg).toContain('CDP account creation failed');

    createSpy.mockRestore();
    logSpy.mockRestore();
  });
});
