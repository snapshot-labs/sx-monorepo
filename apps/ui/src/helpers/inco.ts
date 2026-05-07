/**
 * Browser-side glue between Snapshot's ethers-flavored UI and the Inco
 * confidential-voting SDK.
 *
 * `@inco/js` is hard-wired to viem (it takes a viem `PublicClient` for chain
 * reads and a viem `WalletClient` for attested-decrypt signatures). The UI
 * stays ethers-native, so this module bridges:
 *   - viem `PublicClient` is built from `http()` against Base Sepolia.
 *   - viem `WalletClient` is built from `custom(window.ethereum)` so the
 *     user's MetaMask/WalletConnect signs the decryption-request typed data.
 *
 * Everything is dynamic-imported. Loading this module pulls in viem and
 * `@inco/js`; route-code that doesn't touch confidential voting never imports
 * it, so non-Inco users pay zero bundle cost.
 */

/** Inco SDK's chain key. Base Sepolia is the only supported network for now. */
const INCO_CHAIN_KEY = 'baseSepolia84532' as const;

const RPC_FALLBACK = 'https://sepolia.base.org';

type Hex = `0x${string}`;

export type DecryptionAttestation = {
  handle: Hex;
  value: Hex;
};

export type DecryptionResult = {
  handle: Hex;
  value: bigint | boolean;
  attestation: DecryptionAttestation;
  signatures: Hex[];
};

type CachedSdk = {
  inco: typeof import('@snapshot-labs/sx').inco;
  viem: typeof import('viem');
  baseSepolia: import('viem/chains').Chain;
};

let cached: CachedSdk | null = null;

async function loadSdk(): Promise<CachedSdk> {
  if (cached) return cached;
  const [{ inco }, viem, { baseSepolia }] = await Promise.all([
    import('@snapshot-labs/sx'),
    import('viem'),
    import('viem/chains')
  ]);
  cached = { inco, viem, baseSepolia };
  return cached;
}

/**
 * Read the RPC URL the UI should use for Inco SDK reads. Prefer the env override
 * (`VITE_BASE_SEPOLIA_RPC_URL`) so QA / demo can swap to a paid endpoint without
 * code changes; fall back to the public URL otherwise.
 */
function getRpcUrl(): string {
  const env =
    typeof import.meta !== 'undefined'
      ? (import.meta as ImportMeta & { env?: { VITE_BASE_SEPOLIA_RPC_URL?: string } })
          .env?.VITE_BASE_SEPOLIA_RPC_URL
      : undefined;
  return env || RPC_FALLBACK;
}

async function buildPublicClient() {
  const { viem, baseSepolia } = await loadSdk();
  return viem.createPublicClient({
    chain: baseSepolia,
    transport: viem.http(getRpcUrl())
  });
}

/**
 * Build a viem walletClient backed by the user's injected provider. Throws if
 * no `window.ethereum` is available — Inco decryption flows require the user's
 * wallet to sign a typed-data request.
 */
async function buildWalletClient(account: `0x${string}`) {
  const { viem, baseSepolia } = await loadSdk();
  const eth = (globalThis as { ethereum?: unknown }).ethereum;
  if (!eth) {
    throw new Error(
      'Inco decryption requires an injected EIP-1193 provider (window.ethereum).'
    );
  }
  return viem.createWalletClient({
    account,
    chain: baseSepolia,
    transport: viem.custom(eth as { request: (args: unknown) => Promise<unknown> })
  });
}

/**
 * Encrypt a vote choice as an Inco `euint256` ciphertext bound to (voter, space).
 *
 * Choice mapping is the on-chain Space's: 0 = Against, 1 = For, 2 = Abstain.
 * Pass the result as `Vote.ciphertext` to `client.vote(...)`.
 */
export async function encryptChoice({
  space,
  voter,
  choice
}: {
  space: string;
  voter: string;
  /** SDK-numeric choice (0=Against, 1=For, 2=Abstain) — call `getSdkChoice` first. */
  choice: number | bigint;
}): Promise<Hex> {
  const { inco } = await loadSdk();
  const publicClient = await buildPublicClient();
  const zap = await inco.getZap(publicClient, INCO_CHAIN_KEY);
  return inco.encryptChoice({
    zap,
    space: space as Hex,
    voter: voter as Hex,
    choice: BigInt(choice)
  });
}

/**
 * Read `getQuorumAndSupportHandles(proposalId)` from the Space, then request
 * attested decryption for both handles. Returns the data shape that
 * `client.tryExecute(...)` expects.
 *
 * `account` is the address that holds the decrypt ACL — for the v1 contract
 * this is the proposal author (or any voter, but author is the canonical
 * trigger). The wallet at this address must be connected and able to sign.
 */
export async function decryptDecisionFlags({
  space,
  proposal,
  account
}: {
  space: string;
  proposal: number | bigint;
  account: string;
}): Promise<{ quorum: DecryptionResult; support: DecryptionResult }> {
  const { inco } = await loadSdk();
  const publicClient = await buildPublicClient();
  const zap = await inco.getZap(publicClient, INCO_CHAIN_KEY);

  const handles = (await publicClient.readContract({
    address: space as Hex,
    abi: [
      {
        type: 'function',
        name: 'getQuorumAndSupportHandles',
        inputs: [{ name: 'proposalId', type: 'uint256' }],
        outputs: [
          { name: 'quorumHandle', type: 'bytes32' },
          { name: 'supportHandle', type: 'bytes32' }
        ],
        stateMutability: 'view'
      }
    ] as const,
    functionName: 'getQuorumAndSupportHandles',
    args: [BigInt(proposal)]
  })) as [Hex, Hex];

  const walletClient = await buildWalletClient(account as Hex);
  const results = await inco.decryptHandles({
    zap,
    walletClient,
    handles
  });
  if (results.length !== 2 || !results[0] || !results[1]) {
    throw new Error('Inco decryption did not return the expected handle pair');
  }
  return { quorum: results[0], support: results[1] };
}
