import { randomUUID } from 'node:crypto';
import { type OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import {
  type AuthorizationParams,
  type OAuthServerProvider
} from '@modelcontextprotocol/sdk/server/auth/provider.js';
import { type AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import {
  type OAuthClientInformationFull,
  type OAuthTokens
} from '@modelcontextprotocol/sdk/shared/auth.js';
import { type Request, type Response } from 'express';
import { type JWTPayload, jwtVerify, SignJWT } from 'jose';
import { createFreshAccount } from './cdp.js';
import { resolveUserFromAlias } from './hub.js';

const ALG = 'HS256';

function getSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET;
  if (raw === undefined || raw.length < 32) {
    throw new Error(
      'JWT_SECRET must be set and at least 32 characters. Generate one with: openssl rand -hex 32'
    );
  }
  return new TextEncoder().encode(raw);
}

async function sign(claims: JWTPayload, exp?: string): Promise<string> {
  const jwt = new SignJWT({ ...claims, nonce: randomUUID() })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt();
  if (exp) jwt.setExpirationTime(exp);
  return jwt.sign(getSecret());
}

/** JWT signature already authenticates the payload, so the type cast is sound. */
async function verifyAs<T>(token: string): Promise<T & JWTPayload> {
  const { payload } = await jwtVerify(token, getSecret(), { algorithms: [ALG] });
  return payload as unknown as T & JWTPayload;
}

async function rebrand<T>(p: Promise<T>, msg: string): Promise<T> {
  try { return await p; } catch { throw new Error(msg); }
}

type ClientMetadata = Omit<OAuthClientInformationFull, 'client_id'>;

const clientsStore: OAuthRegisteredClientsStore = {
  async getClient(clientId) {
    try {
      const { metadata } = await verifyAs<{ metadata: ClientMetadata }>(clientId);
      return { ...metadata, client_id: clientId };
    } catch {
      return undefined;
    }
  },
  async registerClient(client) {
    // Strip secrets: client_id is a signed-not-encrypted JWT, anything left
    // here would be readable wherever the client_id is exposed.
    const { client_secret, client_secret_expires_at, ...safe } = client;
    const metadata = {
      ...safe,
      client_id_issued_at: Math.floor(Date.now() / 1000)
    };
    const clientId = await sign({ metadata });
    return { ...metadata, client_id: clientId };
  }
};

interface Session {
  clientId: string;
  codeChallenge: string;
  redirectUri: string;
  signerKey: string;
  signerAddress: string;
  state?: string;
}
type CodeSession = Session & { user: string };
type VerifiedCode = CodeSession & { nonce: string; exp: number };

export class SnapshotOAuthProvider implements OAuthServerProvider {
  clientsStore = clientsStore;
  /**
   * Tracks recently exchanged code nonces for single-use enforcement.
   * Bounded by the 60s code expiry. Resets on restart, opening at most a
   * 60s replay window. PKCE remains the primary defense.
   */
  private usedCodes = new Map<string, number>();

  private markCodeUsed(nonce: string, exp: number): void {
    const now = Math.floor(Date.now() / 1000);
    for (const [k, v] of this.usedCodes) if (v <= now) this.usedCodes.delete(k);
    if (this.usedCodes.has(nonce)) throw new Error('Unknown authorization code');
    this.usedCodes.set(nonce, exp);
  }

  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response
  ): Promise<void> {
    const { signerKey, signerAddress } = await createFreshAccount();
    const sessionToken = await sign(
      {
        redirectUri: params.redirectUri,
        state: params.state,
        codeChallenge: params.codeChallenge,
        clientId: client.client_id,
        signerKey,
        signerAddress
      },
      '10m'
    );
    const baseUrl = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 8080}`;
    const callbackUrl = `${baseUrl}/auth/callback?session=${encodeURIComponent(sessionToken)}`;
    res.redirect(
      `https://snapshot.box/#/settings/alias/authorize/${signerAddress}?redirect_uri=${encodeURIComponent(callbackUrl)}`
    );
  }

  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    code: string
  ): Promise<string> {
    return (await rebrand(verifyAs<CodeSession>(code), 'Unknown authorization code')).codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<OAuthTokens> {
    const c = await rebrand(verifyAs<VerifiedCode>(authorizationCode), 'Unknown authorization code');
    if (c.clientId !== client.client_id) throw new Error('Client mismatch');
    this.markCodeUsed(c.nonce, c.exp);
    const access_token = await sign(
      { sub: c.user, aud: client.client_id, signerKey: c.signerKey },
      '1y'
    );
    return { access_token, token_type: 'bearer' };
  }

  async exchangeRefreshToken(): Promise<OAuthTokens> {
    throw new Error('Refresh tokens are not supported');
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const p = await verifyAs<{ sub: string; aud: string; signerKey: string }>(token);
    if (
      typeof p.sub !== 'string' ||
      typeof p.aud !== 'string' ||
      typeof p.signerKey !== 'string' ||
      typeof p.exp !== 'number'
    ) {
      throw new Error('Invalid token');
    }
    return {
      token,
      clientId: p.aud,
      scopes: [],
      expiresAt: p.exp,
      extra: { user: p.sub, signerKey: p.signerKey }
    };
  }

  async handleCallback(sessionToken: string): Promise<string> {
    const s = await rebrand(verifyAs<Session>(sessionToken), 'Unknown session');
    const user = await resolveUserFromAlias(s.signerAddress);
    if (user === undefined) throw new Error('Alias not authorized');
    const code = await sign({ ...s, user }, '60s');
    const url = new URL(s.redirectUri);
    url.searchParams.set('code', code);
    if (s.state !== undefined) url.searchParams.set('state', s.state);
    return url.toString();
  }

  callback = async (req: Request, res: Response): Promise<void> => {
    const sessionToken = req.query.session as string | undefined;
    if (sessionToken === undefined) {
      res.status(400).send('Missing session');
      return;
    }
    try {
      res.redirect(await this.handleCallback(sessionToken));
    } catch (e) {
      res.status(400).send(e instanceof Error ? e.message : String(e));
    }
  };
}
