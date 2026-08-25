import { beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { CLIENT_METADATA, makeRes, PKCE_CHALLENGE, REDIRECT_URI } from './helpers.js';
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

    const client = await provider.clientsStore.registerClient!(CLIENT_METADATA);

    await expect(
      provider.authorize(
        client,
        {
          redirectUri: REDIRECT_URI,
          state: 'x',
          codeChallenge: PKCE_CHALLENGE,
          codeChallengeMethod: 'S256',
          scopes: []
        } as any,
        makeRes() as any
      )
    ).rejects.toBe(cdpError);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const [fields, msg] = logSpy.mock.calls[0] as unknown as [{ err: unknown }, string];
    expect(fields.err).toBe(cdpError);
    expect(msg).toContain('CDP account creation failed');

    createSpy.mockRestore();
    logSpy.mockRestore();
  });
});
