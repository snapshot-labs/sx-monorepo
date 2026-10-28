// OAuth provider invariants. Each test pins one specific attack the
// SnapshotOAuthProvider must reject.
import { beforeEach, describe, expect, test } from 'bun:test';
import {
  CLIENT_METADATA,
  PKCE_CHALLENGE,
  setGqlHandler,
  startAuthFlow
} from './helpers.js';
import { SnapshotOAuthProvider } from '../src/auth.js';

async function driveAuthCodeFlow(
  provider: SnapshotOAuthProvider,
  user: string,
  opts: { client?: any; codeChallenge?: string } = {}
) {
  const { client, aliasAddress, sessionId } = await startAuthFlow(
    provider,
    opts
  );
  // Mock hub: when handleCallback queries `aliases(where: { alias })`,
  // return the user we want this flow to resolve to.
  setGqlHandler((_q, vars) => {
    const aliasInQuery = (vars)?.where?.alias;
    if (aliasInQuery?.toLowerCase() === aliasAddress.toLowerCase()) {
      return { aliases: [{ address: user }] };
    }
    return { aliases: [] };
  });
  const redirectUrl = await provider.handleCallback(sessionId);
  const url = new URL(redirectUrl);
  return {
    client,
    code: url.searchParams.get('code')!,
    state: url.searchParams.get('state')!,
    sessionId,
    aliasAddress
  };
}

describe('OAuth provider security', () => {
  let provider: SnapshotOAuthProvider;

  beforeEach(() => {
    provider = new SnapshotOAuthProvider();
  });

  test('getClient returns undefined for a forged client_id', async () => {
    const fabricated = Buffer.from(
      JSON.stringify({
        client_name: 'Forged',
        redirect_uris: ['https://evil.example/cb']
      })
    ).toString('base64url');
    const garbage = `${fabricated}.0xdeadbeef`;
    expect(await provider.clientsStore.getClient(garbage)).toBeUndefined();
    expect(
      await provider.clientsStore.getClient('total-nonsense')
    ).toBeUndefined();
  });

  test('challengeForAuthorizationCode returns the exact stored challenge (PKCE binding)', async () => {
    const { client, code } = await driveAuthCodeFlow(
      provider,
      '0x000000000000000000000000000000000000aaaa'
    );
    const got = await provider.challengeForAuthorizationCode(client, code);
    expect(got).toBe(PKCE_CHALLENGE);
  });

  test('exchangeAuthorizationCode rejects unknown / forged codes', async () => {
    const { client } = await driveAuthCodeFlow(
      provider,
      '0x000000000000000000000000000000000000aaaa'
    );
    await expect(
      provider.exchangeAuthorizationCode(client, 'not-a-code')
    ).rejects.toThrow('Unknown authorization code');
    await expect(
      provider.exchangeAuthorizationCode(client, 'a.b.c')
    ).rejects.toThrow('Unknown authorization code');
  });

  test('exchangeAuthorizationCode is single-use (replay rejected)', async () => {
    const { client, code } = await driveAuthCodeFlow(
      provider,
      '0x000000000000000000000000000000000000aaaa'
    );
    const tokens = await provider.exchangeAuthorizationCode(client, code);
    expect(tokens.access_token).toBeTruthy();
    await expect(
      provider.exchangeAuthorizationCode(client, code)
    ).rejects.toThrow('Unknown authorization code');
  });

  test('exchangeAuthorizationCode rejects clientId mismatch', async () => {
    const { code } = await driveAuthCodeFlow(
      provider,
      '0x000000000000000000000000000000000000aaaa'
    );
    const otherClient = await provider.clientsStore.registerClient!({
      ...CLIENT_METADATA,
      client_name: 'Other Client'
    });
    await expect(
      provider.exchangeAuthorizationCode(otherClient, code)
    ).rejects.toThrow('Client mismatch');
  });

  test('handleCallback throws when hub has no alias authorization for the session', async () => {
    const { sessionId } = await startAuthFlow(provider);
    setGqlHandler(() => ({ aliases: [] }));
    await expect(provider.handleCallback(sessionId)).rejects.toThrow(
      'Alias not authorized'
    );
  });

  test('registered client_id JWT never contains a client_secret, regardless of auth method', async () => {
    for (const method of ['none', 'client_secret_basic', 'client_secret_post', undefined]) {
      const client = await provider.clientsStore.registerClient!({
        ...CLIENT_METADATA,
        token_endpoint_auth_method: method,
        client_secret: 'should-be-stripped',
        client_secret_expires_at: 9999999999
      } as any);
      const payloadSegment = client.client_id.split('.')[1];
      const decoded = JSON.parse(Buffer.from(payloadSegment, 'base64url').toString());
      expect(decoded).not.toHaveProperty('client_secret');
      expect(decoded.metadata ?? {}).not.toHaveProperty('client_secret');
      expect(decoded.metadata ?? {}).not.toHaveProperty('client_secret_expires_at');
      expect(JSON.stringify(decoded)).not.toContain('should-be-stripped');
      expect(client).not.toHaveProperty('client_secret');
    }
  });

  test('each authorize() call mints a different per-session alias', async () => {
    const client = await provider.clientsStore.registerClient!(CLIENT_METADATA);
    const aliases = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const { aliasAddress } = await startAuthFlow(provider, {
        client,
        state: `s${i}`
      });
      aliases.add(aliasAddress.toLowerCase());
    }
    expect(aliases.size).toBe(3);
  });
});
