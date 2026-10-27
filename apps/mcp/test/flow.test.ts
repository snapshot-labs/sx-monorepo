// Multi-step / cross-context security scenarios. These exist where
// the security property only emerges from the combination of multiple
// modules — not testable from a single unit.
//
// Out of scope (flagged in plan, repeated here):
//   - Real CDP policy enforcement (no live CDP)
//   - Snapshot hub `aliases` query semantics (hub responsibility)
//   - MCP SDK `requireBearerAuth` middleware (third-party)
//   - TLS / browser CSRF / phishing on snapshot.box
//   - Token theft from disk (out-of-band, same as any bearer credential)

import { beforeEach, describe, expect, test } from 'bun:test';
import { setGqlHandler, startAuthFlow } from './helpers.js';
import { SnapshotOAuthProvider } from '../src/auth.js';

describe('end-to-end OAuth flow security', () => {
  let provider: SnapshotOAuthProvider;

  beforeEach(() => {
    process.env.JWT_SECRET =
      'test-secret-must-be-at-least-32-chars-long-please-yes';
    provider = new SnapshotOAuthProvider();
  });

  test('two parallel users get distinct tokens; tokens cannot be cross-mapped', async () => {
    const userA = '0x000000000000000000000000000000000000aaaa';
    const userB = '0x000000000000000000000000000000000000bbbb';

    // Both flows start before either resolves — interleaved.
    const flowA = await startAuthFlow(provider);
    const flowB = await startAuthFlow(provider, { client: flowA.client });

    expect(flowA.aliasAddress.toLowerCase()).not.toBe(
      flowB.aliasAddress.toLowerCase()
    );

    setGqlHandler((_q, vars) => {
      const alias = (vars)?.where?.alias?.toLowerCase();
      if (alias === flowA.aliasAddress.toLowerCase())
        return { aliases: [{ address: userA }] };
      if (alias === flowB.aliasAddress.toLowerCase())
        return { aliases: [{ address: userB }] };
      return { aliases: [] };
    });

    const codeA = new URL(
      await provider.handleCallback(flowA.sessionId)
    ).searchParams.get('code')!;
    const codeB = new URL(
      await provider.handleCallback(flowB.sessionId)
    ).searchParams.get('code')!;

    const tokensA = await provider.exchangeAuthorizationCode(
      flowA.client,
      codeA
    );
    const tokensB = await provider.exchangeAuthorizationCode(
      flowA.client,
      codeB
    );

    expect(
      (await provider.verifyAccessToken(tokensA.access_token)).extra!.user
    ).toBe(userA);
    expect(
      (await provider.verifyAccessToken(tokensB.access_token)).extra!.user
    ).toBe(userB);

    expect(tokensA.access_token).not.toBe(tokensB.access_token);

    // Headline cross-user attack: take token A, swap the user (sub claim)
    // in the payload to user B's, present for verification. JWT signature
    // must catch the tamper.
    const [header, payload, sig] = tokensA.access_token.split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    claims.sub = userB;
    const morphed = `${header}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.${sig}`;
    expect(provider.verifyAccessToken(morphed)).rejects.toThrow();
  });

  test('rotating JWT_SECRET invalidates all previously issued tokens (kill switch)', async () => {
    const userA = '0x000000000000000000000000000000000000aaaa';
    const flow = await startAuthFlow(provider);

    setGqlHandler(() => ({ aliases: [{ address: userA }] }));
    const code = new URL(
      await provider.handleCallback(flow.sessionId)
    ).searchParams.get('code')!;
    const { access_token: oldToken } = await provider.exchangeAuthorizationCode(
      flow.client,
      code
    );

    expect((await provider.verifyAccessToken(oldToken)).extra!.user).toBe(
      userA
    );

    process.env.JWT_SECRET = 'rotated-secret-also-32-chars-or-more-please-yes';

    expect(provider.verifyAccessToken(oldToken)).rejects.toThrow();
  });
});
