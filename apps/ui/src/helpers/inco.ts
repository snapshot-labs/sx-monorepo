/**
 * Browser-side glue between Snapshot's ethers-flavored UI and the Inco
 * confidential-voting SDK (`@inco/lightning-js`, the v1 rename of `@inco/js`).
 *
 * The SDK is hard-wired to viem (it takes a viem `PublicClient` for chain
 * reads and a viem `WalletClient` for attested-decrypt signatures). The UI
 * stays ethers-native, so this module bridges:
 *   - viem `PublicClient` is built from `http()` against Base Sepolia.
 *   - viem `WalletClient` is built from `custom(window.ethereum)` so the
 *     user's MetaMask/WalletConnect signs the decryption-request typed data.
 *
 * Everything is dynamic-imported. Loading this module pulls in viem and
 * `@inco/lightning-js`; route-code that doesn't touch confidential voting never
 * imports it, so non-Inco users pay zero bundle cost.
 */

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

// Inline import() types keep the SDKs lazy; a top-level import would bundle them.
/* eslint-disable @typescript-eslint/consistent-type-imports */
type CachedSdk = {
  inco: typeof import('@snapshot-labs/sx').inco;
  viem: typeof import('viem');
  baseSepolia: import('viem/chains').Chain;
};
/* eslint-enable @typescript-eslint/consistent-type-imports */

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
      ? (
          import.meta as ImportMeta & {
            env?: { VITE_BASE_SEPOLIA_RPC_URL?: string };
          }
        ).env?.VITE_BASE_SEPOLIA_RPC_URL
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
    transport: viem.custom(
      eth as { request: (args: unknown) => Promise<unknown> }
    )
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
  const zap = await inco.getZap();
  return inco.encryptChoice({
    zap,
    space: space as Hex,
    voter: voter as Hex,
    choice: BigInt(choice)
  });
}

/**
 * Read the current per-vote Inco fee (the `msg.value` a confidential `vote()`
 * must forward — one `newEuint256` per vote). Read from the Inco executor.
 */
export async function getVoteFee(): Promise<bigint> {
  const { inco } = await loadSdk();
  const publicClient = await buildPublicClient();
  const zap = await inco.getZap();
  return inco.getFee({ zap, publicClient });
}

/**
 * Read the on-chain reveal state of a confidential proposal: whether
 * `finalizeReveal` has run and, if so, the cleartext per-choice counts and the
 * computed pass/fail. Used to decide whether the reveal step is still needed and
 * whether `execute` should be attempted (it reverts on a rejected proposal).
 */
export async function getRevealState({
  space,
  proposal
}: {
  space: string;
  proposal: number | bigint;
}): Promise<{
  revealed: boolean;
  against: bigint;
  for: bigint;
  abstain: bigint;
  passed: boolean;
}> {
  const publicClient = await buildPublicClient();
  const abi = [
    {
      type: 'function',
      name: 'revealed',
      inputs: [{ name: 'proposalId', type: 'uint256' }],
      outputs: [{ name: '', type: 'bool' }],
      stateMutability: 'view'
    },
    {
      type: 'function',
      name: 'result',
      inputs: [{ name: 'proposalId', type: 'uint256' }],
      outputs: [
        { name: 'againstVotes', type: 'uint256' },
        { name: 'forVotes', type: 'uint256' },
        { name: 'abstainVotes', type: 'uint256' },
        { name: 'passed', type: 'bool' }
      ],
      stateMutability: 'view'
    }
  ] as const;

  const [revealed, result] = await Promise.all([
    publicClient.readContract({
      address: space as Hex,
      abi,
      functionName: 'revealed',
      args: [BigInt(proposal)]
    }) as Promise<boolean>,
    publicClient.readContract({
      address: space as Hex,
      abi,
      functionName: 'result',
      args: [BigInt(proposal)]
    }) as Promise<readonly [bigint, bigint, bigint, boolean]>
  ]);

  return {
    revealed,
    against: result[0],
    for: result[1],
    abstain: result[2],
    passed: result[3]
  };
}

/**
 * Reveal step 2: read `getVoteTallyHandles(proposalId)` (the three frozen
 * encrypted tallies, indexed `[against, for, abstain]`), then request attested
 * decryption for all three. Returns the data shape `client.finalizeReveal(...)`
 * expects, in that order.
 *
 * `account` is the address that holds the decrypt ACL — i.e. whoever already
 * landed `requestReveal(...)` (reveal is permissionless after voting ends). The
 * wallet at this address must be connected and able to sign the decrypt request.
 */
export async function decryptTallies({
  space,
  proposal,
  account
}: {
  space: string;
  proposal: number | bigint;
  account: string;
}): Promise<DecryptionResult[]> {
  const { inco } = await loadSdk();
  const publicClient = await buildPublicClient();
  const zap = await inco.getZap();

  const handles = (await publicClient.readContract({
    address: space as Hex,
    abi: [
      {
        type: 'function',
        name: 'getVoteTallyHandles',
        inputs: [{ name: 'proposalId', type: 'uint256' }],
        outputs: [
          { name: 'againstHandle', type: 'bytes32' },
          { name: 'forHandle', type: 'bytes32' },
          { name: 'abstainHandle', type: 'bytes32' }
        ],
        stateMutability: 'view'
      }
    ] as const,
    functionName: 'getVoteTallyHandles',
    args: [BigInt(proposal)]
  })) as [Hex, Hex, Hex];

  const walletClient = await buildWalletClient(account as Hex);
  const results = await inco.decryptHandles({
    zap,
    walletClient,
    handles: handles as unknown as Hex[]
  });
  if (results.length !== 3 || results.some(r => !r)) {
    throw new Error(
      'Inco decryption did not return the expected three tally handles'
    );
  }
  return results;
}
