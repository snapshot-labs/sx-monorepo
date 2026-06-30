import Token from './abis/Token.json';
import Token2 from './abis/Token2.json';

export type NetworkID = 'sn';

type Source = {
  name: string;
  contract: string;
  start: number;
  abi: string;
};

const NETWORK_NODE_URLS: Record<NetworkID, string> = {
  sn: 'https://rpc.snapshot.org/sn'
};

const TOKEN_SOURCES: Record<NetworkID, Source[]> = {
  sn: [
    {
      name: 'STRK',
      abi: 'Token',
      contract:
        '0x0782f0ddca11d9950bc3220e35ac82cf868778edb67a5e58b39838544bc4cd0f',
      start: 536311
    },
    {
      name: 'NSTR',
      abi: 'Token2',
      contract:
        '0x00c530f2c0aa4c16a0806365b0898499fba372e5df7a7172dc6fe9ba777e8007',
      start: 644053
    }
  ]
};

export default function createConfig(network: NetworkID) {
  const sources = TOKEN_SOURCES[network].map(source => ({
    ...source,
    events: [
      {
        name: 'DelegateChanged',
        fn: 'handleDelegateChanged'
      },
      {
        name: 'DelegateVotesChanged',
        fn: 'handleDelegateVotesChanged'
      }
    ]
  }));

  return {
    network_node_url: NETWORK_NODE_URLS[network],
    state_retention_blocks: 100,
    sources,
    abis: { Token, Token2 }
  };
}
