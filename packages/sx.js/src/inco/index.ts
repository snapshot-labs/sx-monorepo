/**
 * Inco confidential-voting wrapper.
 *
 * `@inco/lightning-js` (the v1 rename of `@inco/js`) is declared as an optional
 * peerDependency. This module dynamic-imports it the first time `getZap()` is called
 * so non-Inco consumers of sx.js don't pay the bundle cost.
 *
 * The shape of `IncoClient`, viem's `PublicClient` / `WalletClient`, and the
 * decryption-result objects are intentionally typed loosely (`unknown`-ish) — sx.js
 * stays ethers-native and doesn't take a hard dep on viem. Callers that already use
 * viem can pass their own clients through; callers that use ethers can convert
 * (see `/docs/CONFIDENTIAL_VOTING.md`).
 */

import { Choice } from '../types';

export type IncoClient = unknown;
type ViemPublicClient = unknown;
type ViemWalletClient = unknown;

/** Encoded attestation accepted by `Space.finalizeReveal`. */
export type DecryptionAttestation = {
  handle: `0x${string}`;
  value: `0x${string}`;
};

export type DecryptionResult = {
  handle: `0x${string}`;
  value: bigint | boolean;
  attestation: DecryptionAttestation;
  signatures: `0x${string}`[];
};

let cachedSdk: { lite: any; main: any } | null = null;

async function loadIncoSdk() {
  if (cachedSdk) return cachedSdk;
  // @inco/lightning-js is an optional peer dep — type resolution is intentionally
  // suppressed. Runtime resolution happens only when a caller invokes confidential-
  // voting flows. CJS interop: bundlers sometimes wrap CJS named exports under
  // `.default`, sometimes expose them at top level. Normalize both shapes.
  const [liteRaw, mainRaw] = await Promise.all([
    // @ts-ignore optional peer dep — types may not resolve under all
    // moduleResolution modes; sx.js stays bundler-agnostic by design.
    import('@inco/lightning-js/lite').catch(() => {
      throw new Error(
        '@inco/lightning-js is required for confidential voting. Install it as a peer dep: ' +
          'bun add @inco/lightning-js'
      );
    }),
    // @ts-ignore optional peer dep
    import('@inco/lightning-js')
  ]);
  const lite = unwrap(liteRaw);
  const main = unwrap(mainRaw);
  cachedSdk = { lite, main };
  return cachedSdk;
}

function unwrap(mod: any): any {
  // ESM wraps CJS modules; named exports might be at `.default` or top level.
  if (!mod) return mod;
  // Prefer top-level if it carries the expected named exports.
  if (mod.Lightning || mod.supportedChains || mod.handleTypes) return mod;
  // Otherwise look at .default — but merge so callers can read either.
  if (mod.default) return { ...mod.default, ...mod };
  return mod;
}

/**
 * Build an Inco client (`zap`) bound to the latest Lightning deployment on
 * Base Sepolia (chainId 84532).
 *
 * Internally uses `Lightning.baseSepoliaTestnet()` — the hardcoded convenience
 * method that resolves to the latest `pepper=testnet, chainId=84532` deployment
 * from the static table baked into `@inco/lightning-js`. No chain RPC client
 * needed at construction time. (Decryption needs a viem walletClient and fee
 * reads need a viem publicClient; see `decryptHandles` / `getFee`.)
 */
export async function getZap(): Promise<IncoClient> {
  const { lite } = await loadIncoSdk();
  return lite.Lightning.baseSepoliaTestnet();
}

/**
 * Encrypt a vote choice as an `euint256` ciphertext bound to (voter, space).
 *
 * The contract calls `ciphertext.newEuint256(voter)` so the binding here MUST match
 * the address that will appear as `voter` in the on-chain `vote()` call. When using
 * `EthSigAuthenticator`, that's the signing voter — NOT `msg.sender` (which is the
 * authenticator).
 */
export async function encryptChoice({
  zap,
  space,
  voter,
  choice
}: {
  zap: IncoClient;
  space: `0x${string}`;
  voter: `0x${string}`;
  choice: Choice | bigint;
}): Promise<`0x${string}`> {
  const { main } = await loadIncoSdk();
  const z = zap as any;
  return z.encrypt(BigInt(choice), {
    accountAddress: voter,
    dappAddress: space,
    handleType: main.handleTypes.euint256
  }) as Promise<`0x${string}`>;
}

/**
 * Read the current per-ciphertext Inco fee from the executor contract. Each
 * confidential `vote()` ingests one ciphertext (`newEuint256`), so this is the
 * `msg.value` to forward per vote. `publicClient` is any viem PublicClient.
 */
export async function getFee({
  zap,
  publicClient
}: {
  zap: IncoClient;
  publicClient: ViemPublicClient;
}): Promise<bigint> {
  const z = zap as any;
  const pc = publicClient as any;
  return pc.readContract({
    address: z.executorAddress,
    abi: [
      {
        inputs: [],
        name: 'getFee',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'pure',
        type: 'function'
      }
    ],
    functionName: 'getFee'
  }) as Promise<bigint>;
}

/**
 * Request attested decryption of one or more encrypted handles. The walletClient
 * must be authorized in the Space's ACL — for the reveal/execute-split flow that
 * means the caller has already landed `requestReveal(...)`, which grants decrypt
 * access to the three frozen tally handles. Returns the data shape that
 * `Space.finalizeReveal` expects (one entry per handle, in input order).
 *
 * The Inco TEE covalidator may take a few seconds to produce attestations; callers
 * should retry on transient `not ready` errors. We don't retry here so retry policy
 * stays the caller's choice.
 */
export async function decryptHandles({
  zap,
  walletClient,
  handles
}: {
  zap: IncoClient;
  walletClient: ViemWalletClient;
  handles: `0x${string}`[];
}): Promise<DecryptionResult[]> {
  const z = zap as any;
  const results = await z.attestedDecrypt(walletClient, handles);
  return (results as any[]).map(formatDecryption);
}

function formatDecryption(result: any): DecryptionResult {
  const value = result.plaintext.value as bigint | boolean;
  const encodedHex =
    typeof value === 'boolean'
      ? value
        ? `0x${'0'.repeat(63)}1`
        : `0x${'0'.repeat(64)}`
      : `0x${value.toString(16).padStart(64, '0')}`;

  return {
    handle: result.handle as `0x${string}`,
    value,
    attestation: {
      handle: result.handle as `0x${string}`,
      value: encodedHex as `0x${string}`
    },
    signatures: (result.covalidatorSignatures as Uint8Array[]).map(toHex)
  };
}

function toHex(bytes: Uint8Array): `0x${string}` {
  let out = '0x';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out as `0x${string}`;
}
