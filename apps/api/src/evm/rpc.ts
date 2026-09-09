import { RpcSelector } from '@snapshot-labs/checkpoint';
import { EVMConfig, NetworkID } from './types';

const HISTORICAL_BLOCKS = 1000;
const HEAD_MAX_AGE = 15 * 60 * 1000;

type LatestBlock = Parameters<RpcSelector>[0]['latestBlock'];

const PUBLIC_RPC_URLS: Partial<Record<NetworkID, string[]>> = {
  eth: [
    'https://ethereum-rpc.publicnode.com',
    'https://0xrpc.io/eth',
    'https://ethereum.public.blockpi.network/v1/rpc/public',
    'https://eth-mainnet.public.blastapi.io'
  ],
  oeth: [
    'https://optimism-rpc.publicnode.com',
    'https://public-op-mainnet.fastnode.io',
    'https://mainnet.optimism.io',
    'https://op.api.pocket.network'
  ],
  base: [
    'https://base-rpc.publicnode.com',
    'https://base.public.blockpi.network/v1/rpc/public',
    'https://mainnet.base.org',
    'https://base.rpc.sentio.xyz'
  ],
  bnb: [
    'https://bsc-rpc.publicnode.com',
    'https://0.48.club',
    'https://rpc-bsc.48.club',
    'https://bsc.blockrazor.xyz'
  ],
  arb1: [
    'https://arbitrum-one-rpc.publicnode.com',
    'https://arb1.arbitrum.io/rpc',
    'https://arbitrum-one.public.blastapi.io',
    'https://arbitrum-one.rpc.sentio.xyz'
  ],
  mnt: [
    'https://mantle-rpc.publicnode.com',
    'https://mantle.api.pocket.network',
    'https://rpc.mantle.xyz'
  ],
  ape: ['https://rpc.apechain.com'],
  sep: [
    'https://ethereum-sepolia-rpc.publicnode.com',
    'https://0xrpc.io/sep',
    'https://rpc.sepolia.ethpandaops.io'
  ],
  bnbt: ['https://bsc-testnet-rpc.publicnode.com'],
  basesep: [
    'https://base-sepolia-rpc.publicnode.com',
    'https://base-testnet.api.pocket.network',
    'https://sepolia.base.org'
  ],
  curtis: [
    'https://curtis.rpc.caldera.xyz/http',
    'https://rpc.curtis.apechain.com'
  ]
};

/**
 * Live sync goes to public nodes, everything else to default node.
 * Requests for the same block always hit the same node so getBlock and
 * getLogs see a consistent view of the chain head.
 */
export function createRpcSelector(config: EVMConfig): RpcSelector {
  const defaultUrl = config.network_node_url;
  const publicUrls = PUBLIC_RPC_URLS[config.indexerName] ?? [];
  let counter = 0;

  const pickPublic = (index: number) =>
    publicUrls[index % publicUrls.length] ?? defaultUrl;

  const pickForBlock = (blockNumber: number, latestBlock: LatestBlock) => {
    const isFresh =
      latestBlock !== null && Date.now() - latestBlock.updatedAt < HEAD_MAX_AGE;
    if (!isFresh) return defaultUrl;

    return latestBlock.number - blockNumber > HISTORICAL_BLOCKS
      ? defaultUrl
      : pickPublic(blockNumber);
  };

  return context => {
    switch (context.type) {
      case 'getChainId':
      case 'getBlockNumber':
        return pickPublic(counter++);
      case 'getBlock':
        return pickForBlock(context.blockNumber, context.latestBlock);
      case 'getLogs':
        return context.fromBlock === context.toBlock
          ? pickForBlock(context.toBlock, context.latestBlock)
          : defaultUrl;
    }
  };
}
