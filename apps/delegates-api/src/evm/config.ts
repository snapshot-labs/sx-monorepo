import GeneralPurposeFactory from './abis/GeneralPurposeFactory';
import Token from './abis/Token';

export type NetworkID = 'eth';

type Source = {
  name: string;
  contract: string;
  start: number;
};

const NETWORK_NODE_URLS: Record<NetworkID, string> = {
  eth: 'https://rpc.brovider.xyz/1?client=delegates-api'
  // arb1: 'https://rpc.brovider.xyz/42161?client=delegates-api'
};

const TOKEN_SOURCES: Record<NetworkID, Source[]> = {
  eth: [
    {
      name: 'STRK',
      contract: '0xca14007eff0db1f8135f4c25b34de49ab0d42766',
      start: 15983290
    },
    {
      name: 'NSTR',
      contract: '0x610dbd98a28ebba525e9926b6aaf88f9159edbfd',
      start: 19952803
    },
    // {
    //   name: 'UNI',
    //   contract: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    //   start: 10861674
    // },
    // {
    //   name: 'ENS',
    //   contract: '0xc18360217d8f7ab5e7c516566761ea12ce7f9d72',
    //   start: 13533418
    // },
    {
      name: 'SHU',
      contract: '0xe485e2f1bab389c08721b291f6b59780fec83fd7',
      start: 19021394
    },
    // {
    //   name: 'COMP',
    //   contract: '0xc00e94cb662c3520282e6f5717214004a7f26888',
    //   start: 9601359
    // },
    {
      name: 'stRESOLV',
      contract: '0xfe4bce4b3949c35fb17691d8b03c3cadbe2e5e23',
      start: 22565398
    }
  ]
  // arb1: [
  //   {
  //     name: 'ARB',
  //     contract: '0x912ce59144191c1204e64559fe8253a0e49e6548',
  //     start: 70398215
  //   }
  // ]
};

export default function createConfig(network: NetworkID) {
  const sources = TOKEN_SOURCES[network].map(source => ({
    ...source,
    abi: 'Token',
    events: [
      {
        name: 'DelegateChanged(address,address,address)',
        fn: 'handleDelegateChanged'
      },
      {
        name: 'DelegateVotesChanged(address,uint256,uint256)',
        fn: 'handleDelegateVotesChanged'
      }
    ]
  }));

  if (network === 'eth') {
    sources.push({
      name: 'GeneralPurposeFactory',
      contract: '0x0f77c58bb8a75ed393123f9047e1787db637b251',
      start: 20333097,
      abi: 'GeneralPurposeFactory',
      events: [
        {
          name: 'ContractDeployed(address,address)',
          fn: 'handleContractDeployed'
        }
      ]
    });
  }

  const abis = network === 'eth' ? { Token, GeneralPurposeFactory } : { Token };

  return {
    network_node_url: NETWORK_NODE_URLS[network],
    state_retention_blocks: 100,
    sources,
    templates: {
      GenericERC20Votes: {
        abi: 'Token',
        events: [
          {
            name: 'DelegateChanged(address,address,address)',
            fn: 'handleDelegateChanged'
          },
          {
            name: 'DelegateVotesChanged(address,uint256,uint256)',
            fn: 'handleDelegateVotesChanged'
          }
        ]
      }
    },
    abis
  };
}
