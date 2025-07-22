import { gql, request } from 'graphql-request';
import { RpcProvider, uint256 } from 'starknet';

type NetworkID = 'sn' | 'sn-sep';

type NetworkConfig = {
  rpcUrl: string;
  apiUrl: string;
};

type SpacesResponse = {
  spaces: {
    id: string;
    metadata: {
      name: string;
    } | null;
  }[];
};

type BalanceInfo = {
  spaceId: string;
  spaceName: string;
  relayerAddress: string;
  strkBalance: bigint;
  ethBalance: bigint;
};

const MANA_URL = 'https://mana.box';
const ETH_TOKEN_ADDRESS =
  '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
const STARK_TOKEN_ADDRESS =
  '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

const CONFIG: Record<NetworkID, NetworkConfig> = {
  sn: {
    rpcUrl: 'https://rpc.snapshot.org/sn',
    apiUrl: 'https://api.snapshot.box'
  },
  'sn-sep': {
    rpcUrl: 'https://rpc.snapshot.org/sn-sep',
    apiUrl: 'https://testnet-api.snapshot.box'
  }
};

async function run() {
  const networkId = process.argv[2] as NetworkID;
  const config = CONFIG[networkId];

  if (!networkId || !config) {
    console.error(`Invalid network ID. Use 'sn' or 'sn-sep'.`);
    process.exit(1);
  }

  console.log('Fetching spaces', networkId);

  const res: SpacesResponse = await request(
    config.apiUrl,
    gql`
      query Spaces($indexer: String!) {
        spaces(indexer: $indexer, first: 1000) {
          id
          metadata {
            name
          }
        }
      }
    `,
    {
      indexer: networkId
    }
  );

  console.log(`Found ${res.spaces.length} spaces on ${networkId}`);
  console.log('Fetching balances...');

  const provider = new RpcProvider({
    nodeUrl: config.rpcUrl
  });

  const balances: Record<string, BalanceInfo> = {};

  for (const [i, space] of res.spaces.entries()) {
    const response = await fetch(
      `${MANA_URL}/stark_rpc/relayers/spaces/${networkId}:${space.id}`
    );

    const data = await response.json();
    if (!data.address) {
      throw new Error(`No relayer address for space ${space.id}`);
    }

    const relayerAddress = data.address;

    const [strkBalanceUint256, ethBalanceUint256] = await Promise.all([
      provider.callContract({
        contractAddress: STARK_TOKEN_ADDRESS,
        entrypoint: 'balanceOf',
        calldata: [relayerAddress]
      }),
      provider.callContract({
        contractAddress: ETH_TOKEN_ADDRESS,
        entrypoint: 'balanceOf',
        calldata: [relayerAddress]
      })
    ]);

    balances[space.id] = {
      spaceId: space.id,
      spaceName: space.metadata?.name || 'Untitled space',
      relayerAddress,
      strkBalance: uint256.uint256ToBN({
        low: BigInt(strkBalanceUint256[0]!),
        high: BigInt(strkBalanceUint256[1]!)
      }),
      ethBalance: uint256.uint256ToBN({
        low: BigInt(ethBalanceUint256[0]!),
        high: BigInt(ethBalanceUint256[1]!)
      })
    };

    if ((i + 1) % 10 === 0) {
      console.log(`Fetched ${i + 1} spaces`);
    }
  }

  const spacesWithBalances = Object.entries(balances).filter(
    ([, balanceInfo]) =>
      balanceInfo.strkBalance > 0n || balanceInfo.ethBalance > 0n
  );

  for (const [, balanceInfo] of spacesWithBalances) {
    console.log(balanceInfo);
  }
}

run();
