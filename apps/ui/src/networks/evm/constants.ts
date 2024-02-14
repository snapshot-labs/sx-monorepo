import { AbiCoder } from '@ethersproject/abi';
import { clients, evmNetworks } from '@snapshot-labs/sx';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { getUrl, shorten } from '@/helpers/utils';
import { pinGraph } from '@/helpers/pin';
import type { Signer } from '@ethersproject/abstract-signer';
import { NetworkID, StrategyParsedMetadata } from '@/types';
import type { StrategyConfig } from '../types';

import IHCode from '~icons/heroicons-outline/code';
import IHBeaker from '~icons/heroicons-outline/beaker';
import IHCube from '~icons/heroicons-outline/cube';
import IHPencil from '~icons/heroicons-outline/pencil';
import IHClock from '~icons/heroicons-outline/clock';
import IHUserCircle from '~icons/heroicons-outline/user-circle';
import IHLightningBolt from '~icons/heroicons-outline/lightning-bolt';
import { MAX_SYMBOL_LENGTH } from '@/helpers/constants';

export function createConstants(networkId: NetworkID) {
  const config = evmNetworks[networkId];
  if (!config) throw new Error(`Unsupported network ${networkId}`);

  const SUPPORTED_AUTHENTICATORS = {
    [config.Authenticators.EthSig]: true,
    [config.Authenticators.EthTx]: true
  };

  const CONTRACT_SUPPORTED_AUTHENTICATORS = {
    [config.Authenticators.EthTx]: true
  };

  const SUPPORTED_STRATEGIES = {
    [config.Strategies.Vanilla]: true,
    [config.Strategies.Comp]: true,
    [config.Strategies.OZVotes]: true,
    [config.Strategies.Whitelist]: true
  };

  const SUPPORTED_EXECUTORS = {
    SimpleQuorumAvatar: true,
    SimpleQuorumTimelock: true
  };

  const RELAYER_AUTHENTICATORS = {
    [config.Authenticators.EthSig]: 'evm'
  } as const;

  const AUTHS = {
    [config.Authenticators.EthSig]: 'Ethereum signature',
    [config.Authenticators.EthTx]: 'Ethereum transaction'
  };

  const PROPOSAL_VALIDATIONS = {
    [config.ProposalValidations.VotingPower]: 'Voting power'
  };

  const STRATEGIES = {
    [config.Strategies.Vanilla]: 'Vanilla',
    [config.Strategies.Comp]: 'ERC-20 Votes (EIP-5805)',
    [config.Strategies.OZVotes]: 'ERC-20 Votes Comp (EIP-5805)',
    [config.Strategies.Whitelist]: 'Merkle whitelist'
  };

  const EXECUTORS = {
    SimpleQuorumAvatar: 'Safe module (Zodiac)',
    SimpleQuorumTimelock: 'Timelock'
  };

  const EDITOR_AUTHENTICATORS = [
    {
      address: config.Authenticators.EthTx,
      name: 'Ethereum transaction',
      about:
        'Will authenticate a user by checking if the caller address corresponds to the author or voter address.',
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
        const abiCoder = new AbiCoder();

        const strategies = params.strategies.map((strategy: StrategyConfig) => {
          return {
            addr: strategy.address,
            params: strategy.generateParams ? strategy.generateParams(strategy.params)[0] : '0x00'
          };
        });

        return [
          abiCoder.encode(
            ['uint256', 'tuple(address addr, bytes params)[]'],
            [params.threshold, strategies]
          )
        ];
      },
      generateMetadata: async (params: Record<string, any>) => {
        const strategiesMetadata = await Promise.all(
          params.strategies.map(async (strategy: StrategyConfig) => {
            if (!strategy.generateMetadata) return;

            const metadata = await strategy.generateMetadata(strategy.params);
            const pinned = await pinGraph(metadata);

            return `ipfs://${pinned.cid}`;
          })
        );

        return {
          strategies_metadata: strategiesMetadata
        };
      },
      parseParams: async (params: string) => {
        const abiCoder = new AbiCoder();

        return {
          threshold: abiCoder.decode(['uint256', 'tuple(address addr, bytes params)[]'], params)[0]
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
      address: config.Strategies.Vanilla,
      name: 'Vanilla',
      about:
        'A strategy that gives one voting power to anyone. It should only be used for testing purposes and not in production.',
      icon: IHBeaker,
      generateMetadata: async (params: Record<string, any>) => ({
        name: 'Vanilla',
        properties: {
          symbol: params.symbol,
          decimals: 0
        }
      }),
      parseParams: async (params: string, metadata: StrategyParsedMetadata | null) => {
        if (!metadata) throw new Error('Missing metadata');

        return {
          symbol: metadata.symbol
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
          }
        }
      }
    },
    {
      address: config.Strategies.Whitelist,
      name: 'Whitelist',
      about:
        'A strategy that defines a list of addresses each with designated voting power, using a Merkle tree for verification.',
      generateSummary: (params: Record<string, any>) => {
        const length =
          params.whitelist.trim().length === 0 ? 0 : params.whitelist.split('\n').length;

        return `(${length} ${length === 1 ? 'address' : 'addresses'})`;
      },
      generateParams: (params: Record<string, any>) => {
        const whitelist = params.whitelist.split('\n').map((item: string) => {
          const [address, votingPower] = item.split(':');

          return [address, BigInt(votingPower)];
        });

        const tree = StandardMerkleTree.of(whitelist, ['address', 'uint96']);

        const abiCoder = new AbiCoder();
        return [abiCoder.encode(['bytes32'], [tree.root])];
      },
      generateMetadata: async (params: Record<string, any>) => {
        const tree = params.whitelist.split('\n').map((item: string) => {
          const [address, votingPower] = item.split(':');

          return {
            address,
            votingPower: votingPower
          };
        });

        const pinned = await pinGraph({ tree });

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
          whitelist: {
            type: 'string',
            format: 'long',
            title: 'Whitelist',
            examples: ['0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70:40']
          },
          symbol: {
            type: 'string',
            maxLength: 6,
            title: 'Symbol',
            examples: ['e.g. VP']
          }
        }
      }
    },
    {
      address: config.Strategies.OZVotes,
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
            examples: ['e.g. UNI']
          }
        }
      }
    },
    {
      address: config.Strategies.Comp,
      name: 'ERC-20 Votes Comp (EIP-5805)',
      about:
        'A strategy that allows delegated balances of Compound style checkpoint tokens to be used as voting power.',
      icon: IHCode,
      generateSummary: (params: Record<string, any>) =>
        `(${shorten(params.contractAddress)}, ${params.decimals})`,
      generateParams: (params: Record<string, any>) => [params.contractAddress],
      generateMetadata: async (params: Record<string, any>) => ({
        name: 'ERC-20 Votes Comp (EIP-5805)',
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
            examples: ['e.g. UNI']
          }
        }
      }
    }
  ];

  const EDITOR_PROPOSAL_VALIDATION_VOTING_STRATEGIES = EDITOR_VOTING_STRATEGIES;

  const EDITOR_EXECUTION_STRATEGIES = [
    {
      address: '',
      type: 'SimpleQuorumAvatar',
      name: EXECUTORS.SimpleQuorumAvatar,
      about:
        'An execution strategy that allows proposals to execute transactions from a specified target Avatar contract, the most popular one being a Safe.',
      icon: IHUserCircle,
      generateSummary: (params: Record<string, any>) =>
        `(${params.quorum}, ${shorten(params.contractAddress)})`,
      deploy: async (
        client: clients.EvmEthereumTx,
        signer: Signer,
        controller: string,
        spaceAddress: string,
        params: Record<string, any>
      ): Promise<{ address: string; txId: string }> => {
        return client.deployAvatarExecution({
          signer,
          params: {
            controller: params.controller,
            target: params.contractAddress,
            spaces: [spaceAddress],
            quorum: BigInt(params.quorum)
          }
        });
      },
      paramsDefinition: {
        type: 'object',
        title: 'Params',
        additionalProperties: false,
        required: ['controller', 'quorum', 'contractAddress'],
        properties: {
          controller: {
            type: 'string',
            format: 'address',
            title: 'Controller address',
            examples: ['0x0000…']
          },
          quorum: {
            type: 'integer',
            title: 'Quorum',
            examples: ['1']
          },
          contractAddress: {
            type: 'string',
            format: 'address',
            title: 'Avatar address',
            examples: ['0x0000…']
          }
        }
      }
    },
    {
      address: '',
      type: 'SimpleQuorumTimelock',
      name: EXECUTORS.SimpleQuorumTimelock,
      about:
        'Timelock implementation with a specified delay that queues proposal transactions for execution and includes an optional role to veto queued proposals.',
      icon: IHClock,
      generateSummary: (params: Record<string, any>) =>
        `(${params.quorum}, ${params.timelockDelay})`,
      deploy: async (
        client: clients.EvmEthereumTx,
        signer: Signer,
        controller: string,
        spaceAddress: string,
        params: Record<string, any>
      ): Promise<{ address: string; txId: string }> => {
        return client.deployTimelockExecution({
          signer,
          params: {
            controller: params.controller,
            vetoGuardian: params.vetoGuardian || '0x0000000000000000000000000000000000000000',
            spaces: [spaceAddress],
            timelockDelay: BigInt(params.timelockDelay),
            quorum: BigInt(params.quorum)
          }
        });
      },
      paramsDefinition: {
        type: 'object',
        title: 'Params',
        additionalProperties: false,
        required: ['controller', 'quorum', 'timelockDelay'],
        properties: {
          controller: {
            type: 'string',
            format: 'address',
            title: 'Controller address',
            examples: ['0x0000…']
          },
          quorum: {
            type: 'integer',
            title: 'Quorum',
            examples: ['1']
          },
          vetoGuardian: {
            type: 'string',
            format: 'address',
            title: 'Veto guardian address',
            examples: ['0x0000…']
          },
          timelockDelay: {
            type: 'integer',
            format: 'duration',
            title: 'Timelock delay'
          }
        }
      }
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
    EDITOR_PROPOSAL_VALIDATION_VOTING_STRATEGIES,
    EDITOR_EXECUTION_STRATEGIES
  };
}
