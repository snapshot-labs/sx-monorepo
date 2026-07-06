// Inco confidential-voting wrapper. Optional @inco/lightning-js peer dep, lazy-loaded.

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
  // Optional peer dep; normalize CJS/ESM export shapes.
  const [liteRaw, mainRaw] = await Promise.all([
    // @ts-ignore optional peer dep
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
  // Named exports may sit at .default or top-level.
  if (!mod) return mod;
  if (mod.Lightning || mod.supportedChains || mod.handleTypes) return mod;
  // Merge .default so either shape works.
  if (mod.default) return { ...mod.default, ...mod };
  return mod;
}

// Inco client for latest Base Sepolia deployment.
export async function getZap(): Promise<IncoClient> {
  const { lite } = await loadIncoSdk();
  return lite.Lightning.baseSepoliaTestnet();
}

// Bind ciphertext to signing voter, not msg.sender.
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

// Per-ciphertext Inco fee; msg.value to forward per vote.
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

// Needs ACL access via requestReveal; caller retries.
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
