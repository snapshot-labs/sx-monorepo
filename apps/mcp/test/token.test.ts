// Token cryptographic invariants. Each test pins one specific attack
// the verifier must reject. (Roundtrip + payload-tamper coverage lives
// in flow.test.ts as part of the parallel-users scenario.)
import './helpers.js';
import { describe, expect, test } from 'bun:test';
import { InvalidTokenError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { SignJWT } from 'jose';
import { SnapshotOAuthProvider } from '../src/auth.js';

const PAYLOAD = {
  user: '0x000000000000000000000000000000000000aaaa',
  signerKey: 's-fixture',
  clientId: 'client-fixture'
};

const provider = new SnapshotOAuthProvider();

describe('access token security', () => {
  test('token signed with a different secret is rejected', async () => {
    const attackerSecret = new TextEncoder().encode(
      'attacker-secret-also-32-chars-or-more-yes'
    );
    const forged = await new SignJWT({
      signerKey: PAYLOAD.signerKey,
      nonce: 'attacker-nonce'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(PAYLOAD.user)
      .setAudience(PAYLOAD.clientId)
      .setIssuedAt()
      .sign(attackerSecret);
    expect(provider.verifyAccessToken(forged)).rejects.toThrow();
  });

  test('expired, forged and malformed tokens are InvalidTokenError, so clients get 401', async () => {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const sign = (secretKey: Uint8Array, exp: number) =>
      new SignJWT({ signerKey: PAYLOAD.signerKey, nonce: 'n' })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(PAYLOAD.user)
        .setAudience(PAYLOAD.clientId)
        .setIssuedAt(exp - 3600)
        .setExpirationTime(exp)
        .sign(secretKey);
    const now = Math.floor(Date.now() / 1000);
    const expired = await sign(secret, now - 60);
    const forged = await sign(new TextEncoder().encode('attacker-secret-also-32-chars-or-more-yes'), now + 600);
    for (const token of [expired, forged, 'not-a-jwt', '']) {
      expect(provider.verifyAccessToken(token)).rejects.toBeInstanceOf(InvalidTokenError);
    }
    const valid = await sign(secret, now + 600);
    expect((await provider.verifyAccessToken(valid)).extra?.user).toBe(PAYLOAD.user);
  });

  test('malformed tokens throw rather than silently parsing as garbage', () => {
    expect(provider.verifyAccessToken('')).rejects.toThrow();
    expect(provider.verifyAccessToken('not-a-jwt')).rejects.toThrow();
    expect(provider.verifyAccessToken('a.b')).rejects.toThrow();
    expect(provider.verifyAccessToken('a.b.c.d')).rejects.toThrow();
  });
});
