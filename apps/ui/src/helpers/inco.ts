// Bridges ethers UI to viem-based Inco SDK; lazy-loaded.

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

// Inline import() types keep SDKs lazy.
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

async function buildPublicClient() {
  const { viem, baseSepolia } = await loadSdk();
  return viem.createPublicClient({
    chain: baseSepolia,
    transport: viem.http('https://rpc.snapshot.org/84532')
  });
}

// Wallet client over injected provider; decrypt needs a signature.
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

// Encrypt choice to euint256 bound to (voter, space).
export async function encryptChoice({
  space,
  voter,
  choice
}: {
  space: string;
  voter: string;
  /** 0=Against, 1=For, 2=Abstain; call getSdkChoice first. */
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

// Per-vote Inco fee; vote() forwards it as msg.value.
export async function getVoteFee(): Promise<bigint> {
  const { inco } = await loadSdk();
  const publicClient = await buildPublicClient();
  const zap = await inco.getZap();
  return inco.getFee({ zap, publicClient });
}

// On-chain reveal state; gates reveal + execute.
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

// Decrypt 3 tally handles; account must hold decrypt ACL.
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
