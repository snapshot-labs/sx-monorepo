import { AbiCoder } from '@ethersproject/abi';
import { Web3Provider } from '@ethersproject/providers';
import { clients, evmNetworks } from '@snapshot-labs/sx';
import {
  APE_GAS_CONFIGS,
  HELPDESK_URL,
  MAX_SYMBOL_LENGTH
} from '@/helpers/constants';
import { PinFunction } from '@/helpers/pin';
import { getUrl, shorten, sleep } from '@/helpers/utils';
import { generateMerkleTree, getMerkleRoot } from '@/helpers/whitelistServer';
import { NetworkID, StrategyParsedMetadata, VoteType } from '@/types';
import { StrategyConfig } from '../types';
import IHBeaker from '~icons/heroicons-outline/beaker';
import IHClock from '~icons/heroicons-outline/clock';
import IHCode from '~icons/heroicons-outline/code';
import IHCube from '~icons/heroicons-outline/cube';
import IHLightningBolt from '~icons/heroicons-outline/lightning-bolt';
import IHPencil from '~icons/heroicons-outline/pencil';
import IHUserCircle from '~icons/heroicons-outline/user-circle';

export function createConstants(
  networkId: NetworkID,
  { pin }: { pin: PinFunction }
) {
  const config = evmNetworks[networkId];
  if (!config) throw new Error(`Unsupported network ${networkId}`);

  const SUPPORTED_AUTHENTICATORS = {
    [config.Authenticators.EthSigV2]: true,
    [config.Authenticators.EthSig]: true,
    [config.Authenticators.EthTx]: true
  };

  const CONTRACT_SUPPORTED_AUTHENTICATORS = {
    [config.Authenticators.EthSigV2]: true,
    [config.Authenticators.EthTx]: true
  };

  const SUPPORTED_STRATEGIES = {
    [config.Strategies.Vanilla]: true,
    [config.Strategies.Comp]: true,
    [config.Strategies.OZVotes]: true,
    [config.Strategies.Whitelist]: true,
    [config.Strategies.ApeGas]: true
  };

  const SUPPORTED_EXECUTORS = {
    SimpleQuorumAvatar: true,
    SimpleQuorumTimelock: true,
    Axiom: true,
    Isokratia: true
  };

  const RELAYER_AUTHENTICATORS = {
    [config.Authenticators.EthSig]: 'evm',
    [config.Authenticators.EthSigV2]: 'evm'
  } as const;

  const AUTHS = {
    [config.Authenticators.EthSig]: 'Ethereum signature (deprecated)',
    [config.Authenticators.EthSigV2]: 'Ethereum signature',
    [config.Authenticators.EthTx]: 'Ethereum transaction'
  };

  const PROPOSAL_VALIDATIONS = {
    [config.ProposalValidations.VotingPower]: 'Voting power'
  };

  const STRATEGIES = {
    [config.Strategies.Vanilla]: 'Vanilla',
    [config.Strategies.Comp]: 'ERC-20 Votes Comp (EIP-5805)',
    [config.Strategies.OZVotes]: 'ERC-20 Votes (EIP-5805)',
    [config.Strategies.Whitelist]: 'Merkle whitelist',
    [config.Strategies.ApeGas]: 'ApeChain Delegated Gas'
  };

  const EXECUTORS = {
    SimpleQuorumAvatar: 'Safe module (Zodiac)',
    SimpleQuorumTimelock: 'Timelock',
    Axiom: 'Axiom',
    Isokratia: 'Isokratia'
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
      // Deprecated because of missing EIP-1271 support, superseded by EthSigV2
      address: config.Authenticators.EthSig,
      name: 'Ethereum signature (deprecated)',
      deprecated: true,
      about:
        'Will authenticate a user based on an EIP-712 message signed by an Ethereum private key.',
      icon: IHPencil,
      paramsDefinition: null
    },
    {
      address: config.Authenticators.EthSigV2,
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
      generateParams: async (params: Record<string, any>) => {
        const abiCoder = new AbiCoder();

        const strategies = await Promise.all(
          params.strategies.map(async (strategy: StrategyConfig) => {
            return {
              addr: strategy.address,
              params: strategy.generateParams
                ? (await strategy.generateParams(strategy.params))[0]
                : '0x00'
            };
          })
        );

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
            const pinned = await pin(metadata);

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
          threshold: abiCoder
            .decode(
              ['uint256', 'tuple(address addr, bytes params)[]'],
              params
            )[0]
            .toString()
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
            minimum: 1,
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
      link: `${HELPDESK_URL}/en/articles/9839150-vanilla-voting-strategy`,
      icon: IHBeaker,
      generateMetadata: async (params: Record<string, any>) => ({
        name: 'Vanilla',
        properties: {
          symbol: params.symbol,
          decimals: 0
        }
      }),
      parseParams: async (
        params: string,
        metadata: StrategyParsedMetadata | null
      ) => {
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
      type: 'MerkleWhitelist',
      name: 'Whitelist',
      about:
        'A strategy that defines a list of addresses each with designated voting power, using a Merkle tree for verification.',
      link: `${HELPDESK_URL}/en/articles/9839118-whitelist-voting-strategy`,
      generateSummary: (params: Record<string, any>) => {
        const length =
          params.whitelist.trim().length === 0
            ? 0
            : params.whitelist
                .split(/[\n,]/)
                .filter((s: string) => s.trim().length).length;

        return `(${length} ${length === 1 ? 'address' : 'addresses'})`;
      },
      generateParams: async (params: Record<string, any>) => {
        const entries = params.whitelist
          .split(/[\n,]/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length);

        const requestId = await generateMerkleTree({
          network: 'evm',
          entries
        });

        await sleep(500);

        while (true) {
          const root = await getMerkleRoot({
            requestId
          });

          if (root) {
            const abiCoder = new AbiCoder();
            return [abiCoder.encode(['bytes32'], [root])];
          }

          await sleep(5000);
        }
      },
      generateMetadata: async (params: Record<string, any>) => {
        const tree = params.whitelist
          .split(/[\n,]/)
          .filter((s: string) => s.trim().length)
          .map((item: string) => {
            const [address, votingPower] = item.split(':').map(s => s.trim());

            return {
              address,
              votingPower: votingPower
            };
          });

        const pinned = await pin({ tree });

        return {
          name: 'Whitelist',
          properties: {
            symbol: params.symbol,
            decimals: 0,
            payload: `ipfs://${pinned.cid}`
          }
        };
      },
      parseParams: async (
        params: string,
        metadata: StrategyParsedMetadata | null
      ) => {
        if (!metadata) throw new Error('Missing metadata');

        const getWhitelist = async (payload: string) => {
          const metadataUrl = getUrl(payload);

          if (!metadataUrl) return '';

          const res = await fetch(metadataUrl);
          const { tree } = await res.json();
          return tree
            .map((item: any) => `${item.address}:${item.votingPower}`)
            .join('\n');
        };

        return {
          symbol: metadata.symbol,
          whitelist: metadata.payload
            ? await getWhitelist(metadata.payload)
            : ''
        };
      },
      paramsDefinition: {
        type: 'object',
        title: 'Params',
        additionalProperties: false,
        required: ['whitelist'],
        properties: {
          whitelist: {
            type: 'string',
            format: 'addresses-with-voting-power',
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
      link: `${HELPDESK_URL}/en/articles/9839125-erc-20-votes-eip-5805-voting-strategy`,
      icon: IHCode,
      generateSummary: (params: Record<string, any>) =>
        `(${shorten(params.contractAddress)}, ${params.decimals})`,
      generateParams: async (params: Record<string, any>) => [
        params.contractAddress
      ],
      generateMetadata: async (params: Record<string, any>) => ({
        name: 'ERC-20 Votes (EIP-5805)',
        properties: {
          symbol: params.symbol,
          decimals: parseInt(params.decimals),
          token: params.contractAddress
        }
      }),
      parseParams: async (
        params: string,
        metadata: StrategyParsedMetadata | null
      ) => {
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
            chainId: config.Meta.eip712ChainId,
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
      generateParams: async (params: Record<string, any>) => [
        params.contractAddress
      ],
      generateMetadata: async (params: Record<string, any>) => ({
        name: 'ERC-20 Votes Comp (EIP-5805)',
        properties: {
          symbol: params.symbol,
          decimals: parseInt(params.decimals),
          token: params.contractAddress
        }
      }),
      parseParams: async (
        params: string,
        metadata: StrategyParsedMetadata | null
      ) => {
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
            chainId: config.Meta.eip712ChainId,
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
    ...(config.Strategies.ApeGas
      ? [
          {
            address: config.Strategies.ApeGas,
            name: 'ApeChain Delegated Gas',
            about:
              'A strategy that allows delegated balances of APE gas token to be used as voting power.',
            icon: IHCode,
            generateSummary: (params: Record<string, any>) =>
              `(${shorten(params.delegationId)})`,
            generateParams: async (params: Record<string, any>) => {
              const apeGasConfig = APE_GAS_CONFIGS[config.Meta.eip712ChainId];

              const abiCoder = new AbiCoder();

              return [
                abiCoder.encode(
                  [
                    'uint256',
                    'uint256',
                    'address',
                    'address',
                    'bytes32',
                    'address'
                  ],
                  [
                    apeGasConfig.l1ChainId,
                    config.Meta.eip712ChainId,
                    apeGasConfig.herodotusContract,
                    apeGasConfig.herodotusSatelliteContract,
                    params.delegationId,
                    apeGasConfig.registryContract
                  ]
                )
              ];
            },
            generateMetadata: async (params: Record<string, any>) => {
              const pinned = await pin({ delegationId: params.delegationId });

              return {
                name: 'ApeChain Delegated Gas',
                properties: {
                  decimals: 18,
                  symbol: params.symbol,
                  payload: `ipfs://${pinned.cid}`
                }
              };
            },
            parseParams: async (
              params: string,
              metadata: StrategyParsedMetadata | null
            ) => {
              if (!metadata) throw new Error('Missing metadata');
              if (!metadata.payload) {
                throw new Error('Missing metadata payload');
              }

              const metadataUrl = getUrl(metadata.payload);
              if (!metadataUrl) {
                throw new Error('Invalid metadata URL');
              }

              const res = await fetch(metadataUrl);
              const { delegationId } = await res.json();

              return {
                delegationId,
                symbol: metadata.symbol
              };
            },
            paramsDefinition: {
              type: 'object',
              title: 'Params',
              additionalProperties: false,
              required: ['delegationId', 'symbol'],
              properties: {
                delegationId: {
                  type: 'string',
                  format: 'bytes32',
                  title: 'Delegation ID',
                  examples: [
                    'e.g. 0x0000000000000000000000000000000000000000000000000000000000000001'
                  ]
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
        ]
      : [])
  ];

  const EDITOR_PROPOSAL_VALIDATION_VOTING_STRATEGIES =
    EDITOR_VOTING_STRATEGIES.filter(
      strategy =>
        !([config.Strategies.ApeGas] as string[]).includes(strategy.address)
    );

  const EDITOR_EXECUTION_STRATEGIES = [
    {
      address: '',
      type: 'SimpleQuorumAvatar',
      name: EXECUTORS.SimpleQuorumAvatar,
      about:
        'An execution strategy that allows proposals to execute transactions from a specified target Safe contract.',
      icon: IHUserCircle,
      generateSummary: (params: Record<string, any>) =>
        `(${params.quorum}, ${shorten(params.contractAddress)})`,
      deploy: async (
        client: clients.EvmEthereumTx,
        web3: Web3Provider,
        controller: string,
        spaceAddress: string,
        params: Record<string, any>
      ): Promise<{ address: string; txId: string }> => {
        return client.deployAvatarExecution({
          signer: web3.getSigner(),
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
            chainId: config.Meta.eip712ChainId,
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
            chainId: config.Meta.eip712ChainId,
            title: 'Safe address',
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
        web3: Web3Provider,
        controller: string,
        spaceAddress: string,
        params: Record<string, any>
      ): Promise<{ address: string; txId: string }> => {
        return client.deployTimelockExecution({
          signer: web3.getSigner(),
          params: {
            controller: params.controller,
            vetoGuardian:
              params.vetoGuardian ||
              '0x0000000000000000000000000000000000000000',
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
            chainId: config.Meta.eip712ChainId,
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
            chainId: config.Meta.eip712ChainId,
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
    },
    ...(config.ExecutionStrategies.Axiom
      ? [
          {
            address: '',
            type: 'Axiom',
            name: EXECUTORS.Axiom,
            about:
              'This strategy enables offchain votes on the space. The validity of votes and voting power is verified onchain in bulk using a zkSNARK of storage proofs, which then triggers the execution of transactions.',
            icon: IHCode,
            generateSummary: (params: Record<string, any>) =>
              `(${shorten(params.contractAddress)}, ${params.slotIndex})`,
            deploy: async (
              client: clients.EvmEthereumTx,
              web3: Web3Provider,
              _controller: string,
              spaceAddress: string,
              params: Record<string, any>
            ): Promise<{ address: string; txId: string }> => {
              return client.deployAxiomExecution({
                signer: web3.getSigner(),
                params: {
                  controller:
                    params.controller ||
                    '0x0000000000000000000000000000000000000000',
                  quorum: BigInt(params.quorum),
                  contractAddress:
                    params.contractAddress ||
                    '0x0000000000000000000000000000000000000000',
                  slotIndex: BigInt(params.slotIndex),
                  space: spaceAddress,
                  querySchema:
                    '0xa09cc16ccaa32b96ca5c404c1b4be60d7883a7178f432e8f9f3c22157fc0f873'
                }
              });
            },
            paramsDefinition: {
              type: 'object',
              title: 'Params',
              additionalProperties: false,
              required: [
                'controller',
                'quorum',
                'contractAddress',
                'slotIndex'
              ],
              properties: {
                controller: {
                  type: 'string',
                  format: 'address',
                  chainId: config.Meta.eip712ChainId,
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
                  chainId: config.Meta.eip712ChainId,
                  title: 'Contract address',
                  examples: ['0x0000…']
                },
                slotIndex: {
                  type: 'integer',
                  title: 'Slot index',
                  examples: ['0']
                }
              }
            }
          }
        ]
      : []),
    ...(config.ExecutionStrategies.Isokratia
      ? [
          {
            address: '',
            type: 'Isokratia',
            name: EXECUTORS.Isokratia,
            about:
              'This strategy enables offchain votes on the space. The validity of votes is verified onchain in bulk using a zkSNARK, which then triggers the execution of transactions.',
            icon: IHCode,
            generateSummary: (params: Record<string, any>) =>
              `(${shorten(params.contractAddress)}, ${params.slotIndex})`,
            deploy: async (
              client: clients.EvmEthereumTx,
              web3: Web3Provider,
              _controller: string,
              _spaceAddress: string,
              params: Record<string, any>
            ): Promise<{ address: string; txId: string }> => {
              return client.deployIsokratiaExecution({
                signer: web3.getSigner(),
                params: {
                  provingTimeAllowance: params.provingTimeAllowance,
                  quorum: BigInt(params.quorum),
                  queryAddress:
                    params.queryAddress ||
                    '0x0000000000000000000000000000000000000000',
                  contractAddress:
                    params.contractAddress ||
                    '0x0000000000000000000000000000000000000000',
                  slotIndex: BigInt(params.slotIndex)
                }
              });
            },
            paramsDefinition: {
              type: 'object',
              title: 'Params',
              additionalProperties: false,
              required: [
                'provingTimeAllowance',
                'quorum',
                'queryAddress',
                'contractAddress',
                'slotIndex'
              ],
              properties: {
                provingTimeAllowance: {
                  type: 'integer',
                  title: 'Proving time allowance',
                  examples: ['3600']
                },
                quorum: {
                  type: 'integer',
                  title: 'Quorum',
                  examples: ['1']
                },
                queryAddress: {
                  type: 'string',
                  format: 'address',
                  chainId: config.Meta.eip712ChainId,
                  title: 'Query address',
                  examples: ['0x0000…']
                },
                contractAddress: {
                  type: 'string',
                  format: 'address',
                  chainId: config.Meta.eip712ChainId,
                  title: 'Contract address',
                  examples: ['0x0000…']
                },
                slotIndex: {
                  type: 'integer',
                  title: 'Slot index',
                  examples: ['0']
                }
              }
            }
          }
        ]
      : [])
  ];

  const EDITOR_VOTING_TYPES: VoteType[] = ['basic'];

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
    EDITOR_EXECUTION_STRATEGIES,
    EDITOR_VOTING_TYPES
  };
}
