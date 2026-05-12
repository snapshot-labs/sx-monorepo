import { Wallet } from '@ethersproject/wallet';
import { mock } from 'bun:test';
import { type SnapshotOAuthProvider } from '../src/auth.js';

process.env.JWT_SECRET ??=
  'test-secret-must-be-at-least-32-chars-long-please-yes';

let gqlHandler: (query: string, variables?: any) => unknown = () => ({});

export function setGqlHandler(fn: (query: string, variables?: any) => unknown) {
  gqlHandler = fn;
}

mock.module('../src/cdp.ts', () => ({
  getWalletForUser: async () => Wallet.createRandom(),
  createFreshAccount: async () => {
    const w = Wallet.createRandom();
    return {
      signerKey: `s-${w.address.slice(2, 18).toLowerCase()}`,
      signerAddress: w.address
    };
  }
}));

mock.module('../src/hub.ts', () => ({
  gql: async (q: string, v?: any) => gqlHandler(q, v),
  resolveUserFromAlias: async (alias: string) => {
    const result = (await gqlHandler('aliases', {
      where: { alias }
    })) as { aliases?: { address: string }[] };
    return (result?.aliases ?? [])[0]?.address;
  },
  schemaCache: Promise.resolve({})
}));

export function makeRes() {
  let redirectedTo: string | null = null;
  return {
    redirect: (url: string) => {
      redirectedTo = url;
    },
    get redirectedTo() {
      return redirectedTo;
    }
  };
}

const REDIRECT_URI = 'http://localhost:17623/oauth/callback';
const PKCE_CHALLENGE = 'test-challenge-7chars-or-more-here';

export const CLIENT_METADATA = {
  redirect_uris: [REDIRECT_URI],
  token_endpoint_auth_method: 'none',
  grant_types: ['authorization_code'],
  response_types: ['code'],
  client_name: 'Test Client'
} as any;

export async function startAuthFlow(
  provider: SnapshotOAuthProvider,
  opts: {
    client?: any;
    codeChallenge?: string;
    state?: string;
  } = {}
) {
  const client =
    opts.client ??
    (await provider.clientsStore.registerClient!(CLIENT_METADATA));
  const res = makeRes();
  await provider.authorize(
    client,
    {
      redirectUri: REDIRECT_URI,
      state: opts.state ?? 'csrf-state-xyz',
      codeChallenge: opts.codeChallenge ?? PKCE_CHALLENGE,
      codeChallengeMethod: 'S256',
      scopes: []
    } as any,
    res as any
  );
  const url = res.redirectedTo as string;
  const aliasAddress = url.match(/authorize\/(0x[0-9a-fA-F]+)/)![1];
  const sessionId = decodeURIComponent(url).match(/session=([^&]+)/)![1];
  return { client, aliasAddress, sessionId };
}

export { PKCE_CHALLENGE, REDIRECT_URI };
