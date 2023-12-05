import { CallData, uint256 } from 'starknet';
import { utils } from '@snapshot-labs/sx';
import { getUrl, shorten } from '@/helpers/utils';
import { pinPineapple } from '@/helpers/pin';
import { StrategyConfig } from '../types';

import IHCode from '~icons/heroicons-outline/code';
import IHCube from '~icons/heroicons-outline/cube';
import IHPencil from '~icons/heroicons-outline/pencil';
import IHLightningBolt from '~icons/heroicons-outline/lightning-bolt';
import { MAX_SYMBOL_LENGTH } from '@/helpers/constants';
import { NetworkID, StrategyParsedMetadata } from '@/types';

// TODO: We should have something like this in sx.js as base for this constants file as well as networkConfig
const CONFIGS = {
  sn: {
    Authenticators: {
      EthSig: '0xb610082a0f39458e03a96663767ec25d6fb259f32c1e0dd19bf2be7a52532c',
      EthTx: '0x63c89d1c6b938b68e88db2719cf2546a121c23642974c268515238b442b0ea0',
      StarkSig: '0x6e9de29d8c3551e7f845888f323e864ff214359b56a137633bf7e191035b442',
      StarkTx: '0x687b57bc5459d05d9575483be8ed8e623c379484fdb1aad18b073ffd4602099'
    },
    Strategies: {
      MerkleWhitelist: '0x528b83a6af52c56cb2134fd9190a441e930831af437c1cb0fa6e459ad1435ba',
      ERC20Votes: '0x2429becc80a90bbeb38c6566617c584f79c60f684e8e73313af58b109b7d637'
    },
    ProposalValidations: {
      VotingPower: '0x1b28f95cbc5bcbe52014ef974d609f14497517f31d3c9e079a2464edf988751'
    },
    ExecutionStrategies: {
      NoExecutionSimpleMajority: '0x180e1f4fcd875b35690b6771b30197867d39c893d5ba6e32c36616733ee37c4'
    }
  },
  'sn-tn': {
    Authenticators: {
      EthSig: '0x48b33fe56e9b9354d4278ffdd5f6d546b13aa3d8c33149db2e2e2fdb48a369e',
      EthTx: '0xd6f14d3df9ea2db12ed9572ab41d527f18dd24192e1744d3c100b2cd470812',
      StarkSig: '0x5280813396bf63dd47531ccdbfa5887099d44421d3f62db3de8f7bed68794f5',
      StarkTx: '0x573a7fc4d8dd3a860b376741c251772cd4d15508dd94564ff23a645d28042d'
    },
    Strategies: {
      MerkleWhitelist: '0xe3ca14dcb7862116bbbe4331a9927c6693b141aa8936bb76e2bdfa4b551a52',
      ERC20Votes: '0x30258c0b5832763b16f4e5d2ddbf97b3d61b8ff3368a3e3f112533b8549dd29'
    },
    ProposalValidations: {
      VotingPower: '0x3ff398ab4e0aa9109c0cc889ff968c6215053a5e2176519b59f8ba87927c631'
    },
    ExecutionStrategies: {
      NoExecutionSimpleMajority: '0x4a5658d6b9fe62283147719a8b13d72f96e8959afacc716569b936c91089147'
    }
  }
};

export function createConstants(networkId: NetworkID) {
  const config = CONFIGS[networkId];
  if (!config) throw new Error(`Unsupported network ${networkId}`);

  const SUPPORTED_AUTHENTICATORS = {
    [config.Authenticators.EthSig]: true,
    [config.Authenticators.EthTx]: true,
    [config.Authenticators.StarkSig]: true,
    [config.Authenticators.StarkTx]: true
  };

  const CONTRACT_SUPPORTED_AUTHENTICATORS = {
    [config.Authenticators.EthTx]: true
  };

  const SUPPORTED_STRATEGIES = {
    [config.Strategies.MerkleWhitelist]: true,
    [config.Strategies.ERC20Votes]: true
  };

  const SUPPORTED_EXECUTORS = {};

  const RELAYER_AUTHENTICATORS = {
    [config.Authenticators.StarkSig]: 'starknet',
    [config.Authenticators.EthSig]: 'evm',
    [config.Authenticators.EthTx]: 'evm-tx'
  } as const;

  const AUTHS = {
    [config.Authenticators.EthSig]: 'Ethereum signature',
    [config.Authenticators.EthTx]: 'Ethereum transaction',
    [config.Authenticators.StarkSig]: 'Starknet signature',
    [config.Authenticators.StarkTx]: 'Starknet transaction'
  };

  const PROPOSAL_VALIDATIONS = {
    [config.ProposalValidations.VotingPower]: 'Voting power'
  };

  const STRATEGIES = {
    [config.Strategies.MerkleWhitelist]: 'Merkle whitelist',
    [config.Strategies.ERC20Votes]: 'ERC-20 Votes (EIP-5805)'
  };

  const EXECUTORS = {
    NoExecutionSimpleMajority: 'No execution simple majority',
    EthRelayer: 'Eth relayer'
  };

  const EDITOR_AUTHENTICATORS = [
    {
      address: config.Authenticators.StarkTx,
      name: 'Starknet transaction',
      about:
        'Will authenticate a user by checking if the caller address corresponds to the author or voter address.',
      icon: IHCube,
      paramsDefinition: null
    },
    {
      address: config.Authenticators.StarkSig,
      name: 'Starknet signature',
      about:
        'Will authenticate a user based on an EIP-712 message signed by a Starknet private key.',
      icon: IHPencil,
      paramsDefinition: null
    },
    {
      address: config.Authenticators.EthTx,
      name: 'Ethereum transaction',
      about:
        'Will authenticate a user by checking if the caller address of Ethereum transaction corresponds to the author or voter address.',
      icon: IHCube,
      paramsDefinition: null
    },
    {
      address: config.Authenticators.EthSig,
      name: 'Ethereum signature',
      about:
        'Will authenticate a user based on an EIP-712 message signed by an Ethereum private key.',
      icon: IHPencil,
      paramsDefinition: null
    }
  ];

  const EDITOR_PROPOSAL_VALIDATIONS = [
    {
      address: config.ProposalValidations.VotingPower,
      type: 'VotingPower',
      name: 'Voting power',
      icon: IHLightningBolt,
      validate: (params: Record<string, any>) => {
        return params?.strategies?.length > 0;
      },
      generateSummary: (params: Record<string, any>) => `(${params.threshold})`,
      generateParams: (params: Record<string, any>) => {
        const strategies = params.strategies.map((strategy: StrategyConfig) => {
          return {
            address: strategy.address,
            params: strategy.generateParams ? strategy.generateParams(strategy.params) : []
          };
        });

        return CallData.compile({
          threshold: uint256.bnToUint256(params.threshold),
          allowed_strategies: strategies
        });
      },
      generateMetadata: async (params: Record<string, any>) => {
        const strategiesMetadata = await Promise.all(
          params.strategies.map(async (strategy: StrategyConfig) => {
            if (!strategy.generateMetadata) return;

            const metadata = await strategy.generateMetadata(strategy.params);
            const pinned = await pinPineapple(metadata);

            return `ipfs://${pinned.cid}`;
          })
        );

        return {
          strategies_metadata: strategiesMetadata
        };
      },
      parseParams: async (params: string) => {
        const [low, high] = params.split(',');

        return {
          threshold: uint256.uint256ToBN({ low, high }).toString(10)
        };
      },
      paramsDefinition: {
        type: 'object',
        title: 'Params',
        additionalProperties: false,
        required: ['threshold'],
        properties: {
          threshold: {
            type: 'integer',
            title: 'Proposal threshold',
            examples: ['1']
          }
        }
      }
    }
  ];

  const EDITOR_VOTING_STRATEGIES = [
    {
      address: config.Strategies.MerkleWhitelist,
      name: 'Whitelist',
      about:
        'A strategy that defines a list of addresses each with designated voting power, using a Merkle tree for verification.',
      generateSummary: (params: Record<string, any>) => {
        const length =
          params.whitelist.trim().length === 0 ? 0 : params.whitelist.split('\n').length;

        return `(${length} ${length === 1 ? 'address' : 'addresses'})`;
      },
      generateParams: (params: Record<string, any>) => {
        const leaves = params.whitelist.split('\n').map((item: string) => {
          const [address, votingPower] = item.split(':');
          const type =
            address.length === 42
              ? utils.merkle.AddressType.ETHEREUM
              : utils.merkle.AddressType.STARKNET;

          return new utils.merkle.Leaf(type, address, BigInt(votingPower));
        });

        return [
          utils.merkle.generateMerkleRoot(leaves.map((leaf: utils.merkle.Leaf) => leaf.hash))
        ];
      },
      generateMetadata: async (params: Record<string, any>) => {
        const tree = params.whitelist.split('\n').map((item: string) => {
          const [address, votingPower] = item.split(':');
          const type = address.length === 42 ? 1 : 0;

          return {
            type,
            address,
            votingPower: votingPower
          };
        });

        const pinned = await pinPineapple({ tree });

        return {
          name: 'Whitelist',
          properties: {
            symbol: params.symbol,
            decimals: 0,
            payload: `ipfs://${pinned.cid}`
          }
        };
      },
      parseParams: async (params: string, metadata: StrategyParsedMetadata | null) => {
        if (!metadata) throw new Error('Missing metadata');

        const getWhitelist = async (payload: string) => {
          const metadataUrl = getUrl(payload);

          if (!metadataUrl) return '';

          const res = await fetch(metadataUrl);
          const { tree } = await res.json();
          return tree.map((item: any) => `${item.address}:${item.votingPower}`).join('\n');
        };

        return {
          symbol: metadata.symbol,
          whitelist: metadata.payload ? await getWhitelist(metadata.payload) : ''
        };
      },
      paramsDefinition: {
        type: 'object',
        title: 'Params',
        additionalProperties: false,
        required: [],
        properties: {
          symbol: {
            type: 'string',
            maxLength: MAX_SYMBOL_LENGTH,
            title: 'Symbol',
            examples: ['e.g. VP']
          },
          whitelist: {
            type: 'string',
            format: 'long',
            title: 'Whitelist',
            examples: ['0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70:40']
          }
        }
      }
    },
    {
      address: config.Strategies.ERC20Votes,
      name: 'ERC-20 Votes (EIP-5805)',
      about:
        'A strategy that allows delegated balances of OpenZeppelin style checkpoint tokens to be used as voting power.',
      icon: IHCode,
      generateSummary: (params: Record<string, any>) =>
        `(${shorten(params.contractAddress)}, ${params.decimals})`,
      generateParams: (params: Record<string, any>) => [params.contractAddress],
      generateMetadata: async (params: Record<string, any>) => ({
        name: 'ERC-20 Votes (EIP-5805)',
        properties: {
          symbol: params.symbol,
          decimals: parseInt(params.decimals),
          token: params.contractAddress
        }
      }),
      parseParams: async (params: string, metadata: StrategyParsedMetadata | null) => {
        if (!metadata) throw new Error('Missing metadata');

        const getWhitelist = async (payload: string) => {
          const metadataUrl = getUrl(payload);

          if (!metadataUrl) return '';

          const res = await fetch(metadataUrl);
          const { tree } = await res.json();
          return tree.map((item: any) => `${item.address}:${item.votingPower}`).join('\n');
        };

        return {
          symbol: metadata.symbol,
          whitelist: metadata.payload ? await getWhitelist(metadata.payload) : ''
        };
      },
      paramsDefinition: {
        type: 'object',
        title: 'Params',
        additionalProperties: false,
        required: [],
        properties: {
          symbol: {
            type: 'string',
            maxLength: 6,
            title: 'Symbol',
            examples: ['e.g. VP']
          },
          whitelist: {
            type: 'string',
            format: 'long',
            title: 'Whitelist',
            examples: ['0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70:40']
          }
        }
      }
    },
    {
      address: config.Strategies.ERC20Votes,
      name: 'ERC-20 Votes (EIP-5805)',
      about:
        'A strategy that allows delegated balances of OpenZeppelin style checkpoint tokens to be used as voting power.',
      icon: IHCode,
      generateSummary: (params: Record<string, any>) =>
        `(${shorten(params.contractAddress)}, ${params.decimals})`,
      generateParams: (params: Record<string, any>) => [params.contractAddress],
      generateMetadata: async (params: Record<string, any>) => ({
        name: 'ERC-20 Votes (EIP-5805)',
        properties: {
          symbol: params.symbol,
          decimals: parseInt(params.decimals),
          token: params.contractAddress
        }
      }),
      parseParams: async (params: string, metadata: StrategyParsedMetadata | null) => {
        if (!metadata) throw new Error('Missing metadata');

        return {
          contractAddress: metadata.token,
          decimals: metadata.decimals,
          symbol: metadata.symbol
        };
      },
      paramsDefinition: {
        type: 'object',
        title: 'Params',
        additionalProperties: false,
        required: ['contractAddress', 'decimals'],
        properties: {
          contractAddress: {
            type: 'string',
            format: 'address',
            title: 'Token address',
            examples: ['0x0000…']
          },
          decimals: {
            type: 'integer',
            title: 'Decimals',
            examples: ['18']
          },
          symbol: {
            type: 'string',
            maxLength: MAX_SYMBOL_LENGTH,
            title: 'Symbol',
            examples: ['e.g. COMP']
          }
        }
      }
    }
  ];

  const EDITOR_EXECUTION_STRATEGIES = [
    {
      address: config.ExecutionStrategies.NoExecutionSimpleMajority,
      type: 'NoExecutionSimpleMajority',
      name: EXECUTORS.NoExecutionSimpleMajority,
      paramsDefinition: null
    }
  ];

  return {
    SUPPORTED_AUTHENTICATORS,
    CONTRACT_SUPPORTED_AUTHENTICATORS,
    SUPPORTED_STRATEGIES,
    SUPPORTED_EXECUTORS,
    RELAYER_AUTHENTICATORS,
    AUTHS,
    PROPOSAL_VALIDATIONS,
    STRATEGIES,
    EXECUTORS,
    EDITOR_AUTHENTICATORS,
    EDITOR_PROPOSAL_VALIDATIONS,
    EDITOR_VOTING_STRATEGIES,
    EDITOR_EXECUTION_STRATEGIES
  };
}
