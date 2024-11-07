import { Web3Provider } from '@ethersproject/providers';
import { clients, starknetNetworks, utils } from '@snapshot-labs/sx';
import { CallData, uint256 } from 'starknet';
import { HELPDESK_URL, MAX_SYMBOL_LENGTH } from '@/helpers/constants';
import { pinPineapple } from '@/helpers/pin';
import { getUrl, shorten, verifyNetwork } from '@/helpers/utils';
import { NetworkID, StrategyParsedMetadata, VoteType } from '@/types';
import { EVM_CONNECTORS } from '../common/constants';
import { StrategyConfig, StrategyTemplate } from '../types';
import IHCode from '~icons/heroicons-outline/code';
import IHCube from '~icons/heroicons-outline/cube';
import IHLightningBolt from '~icons/heroicons-outline/lightning-bolt';
import IHPencil from '~icons/heroicons-outline/pencil';
import IHUserCircle from '~icons/heroicons-outline/user-circle';

export function createConstants(
  networkId: NetworkID,
  baseNetworkId: NetworkID,
  baseChainId: number
) {
  const config = starknetNetworks[networkId as 'sn' | 'sn-sep'];
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
    [config.Strategies.ERC20Votes]: true,
    [config.Strategies.EVMSlotValue]: true,
    [config.Strategies.OZVotesStorageProof]: true,
    [config.Strategies.OZVotesTrace208StorageProof]: true
  };

  const STORAGE_PROOF_STRATEGIES_TYPES = [
    config.Strategies.EVMSlotValue,
    config.Strategies.OZVotesStorageProof,
    config.Strategies.OZVotesTrace208StorageProof
  ];

  const SUPPORTED_EXECUTORS = {
    EthRelayer: true
  };

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
    [config.Strategies.ERC20Votes]: 'ERC-20 Votes (EIP-5805)',
    [config.Strategies.EVMSlotValue]: 'EVM slot value',
    [config.Strategies.OZVotesStorageProof]:
      'OZ Votes storage proof (trace 224)',
    [config.Strategies.OZVotesTrace208StorageProof]:
      'OZ Votes storage proof (trace 208)'
  };

  const EXECUTORS = {
    NoExecutionSimpleMajority: 'No execution simple majority',
    EthRelayer: 'Eth relayer'
  };

  const createSlotValueStrategyConfig = (
    address: string,
    name: string,
    about: string,
    link?: string
  ): StrategyTemplate => ({
    address,
    name,
    about,
    link,
    icon: IHCode,
    generateSummary: (params: Record<string, any>) =>
      `(${shorten(params.contractAddress)}, ${params.slotIndex})`,
    generateParams: (params: Record<string, any>) => {
      return CallData.compile({
        contract_address: params.contractAddress,
        slot_index: uint256.bnToUint256(params.slotIndex)
      });
    },
    generateMetadata: async (params: Record<string, any>) => ({
      name,
      properties: {
        symbol: params.symbol,
        decimals: parseInt(params.decimals),
        token: params.contractAddress,
        payload: JSON.stringify({
          contractAddress: params.contractAddress,
          slotIndex: params.slotIndex
        })
      }
    }),
    parseParams: async (
      params: string,
      metadata: StrategyParsedMetadata | null
    ) => {
      if (!metadata || !metadata.payload) throw new Error('Missing metadata');

      const [contractAddress] = params.split(',');
      const { slotIndex } = JSON.parse(metadata.payload);

      return {
        contractAddress,
        decimals: metadata.decimals,
        symbol: metadata.symbol,
        slotIndex
      };
    },
    paramsDefinition: {
      type: 'object',
      title: 'Params',
      additionalProperties: false,
      required: ['contractAddress', 'slotIndex'],
      properties: {
        contractAddress: {
          type: 'string',
          format: 'address',
          title: 'Contract address',
          examples: ['0x0000…']
        },
        slotIndex: {
          type: 'integer',
          title: 'Slot index',
          examples: ['0']
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
  });

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
            params: strategy.generateParams
              ? strategy.generateParams(strategy.params)
              : []
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
            minimum: 1,
            examples: ['1']
          }
        }
      }
    }
  ];

  const EDITOR_VOTING_STRATEGIES = [
    {
      address: config.Strategies.MerkleWhitelist,
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
      generateParams: (params: Record<string, any>) => {
        const leaves = params.whitelist
          .split(/[\n,]/)
          .filter((s: string) => s.trim().length)
          .map((item: string) => {
            const [address, votingPower] = item.split(':').map(s => s.trim());
            const type =
              address.length === 42
                ? utils.merkle.AddressType.ETHEREUM
                : utils.merkle.AddressType.STARKNET;

            return new utils.merkle.Leaf(type, address, BigInt(votingPower));
          });

        return [
          utils.merkle.generateMerkleRoot(
            leaves.map((leaf: utils.merkle.Leaf) => leaf.hash)
          )
        ];
      },
      generateMetadata: async (params: Record<string, any>) => {
        const tree = params.whitelist
          .split(/[\n,]/)
          .filter((s: string) => s.trim().length)
          .map((item: string) => {
            const [address, votingPower] = item.split(':').map(s => s.trim());
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
        required: [],
        properties: {
          whitelist: {
            type: 'string',
            format: 'addresses-with-voting-power',
            title: 'Whitelist',
            examples: ['0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70:40']
          },
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
      address: config.Strategies.ERC20Votes,
      name: 'ERC-20 Votes (EIP-5805)',
      about:
        'A strategy that allows delegated balances of OpenZeppelin style checkpoint tokens to be used as voting power.',
      link: `${HELPDESK_URL}/en/articles/9839125-erc-20-votes-eip-5805-voting-strategy`,
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
    ...(config.Strategies.EVMSlotValue
      ? [
          createSlotValueStrategyConfig(
            config.Strategies.EVMSlotValue,
            'EVM slot value',
            'A strategy that allows to use the value of an slot on EVM chain (for example ERC-20 balance on L1) as voting power.',
            `${HELPDESK_URL}/en/articles/9839132-evm-slot-value-voting-strategy`
          )
        ]
      : []),
    ...(config.Strategies.OZVotesStorageProof
      ? [
          createSlotValueStrategyConfig(
            config.Strategies.OZVotesStorageProof,
            'OZ Votes storage proof (trace 224)',
            'A strategy that allows to use the value of an slot on EVM chain (for example ERC-20 balance on L1) as voting power including delegated balances (trace 224 format).',
            `${HELPDESK_URL}/en/articles/9839152-oz-votes-storage-proof-voting-strategy`
          )
        ]
      : []),
    ...(config.Strategies.OZVotesTrace208StorageProof
      ? [
          createSlotValueStrategyConfig(
            config.Strategies.OZVotesTrace208StorageProof,
            'OZ Votes storage proof (trace 208)',
            'A strategy that allows to use the value of an slot on EVM chain (for example ERC-20 balance on L1) as voting power including delegated balances (trace 208 format).'
          )
        ]
      : [])
  ];

  const EDITOR_PROPOSAL_VALIDATION_VOTING_STRATEGIES =
    EDITOR_VOTING_STRATEGIES.filter(
      strategy =>
        !(
          [
            config.Strategies.EVMSlotValue,
            config.Strategies.OZVotesStorageProof
          ] as string[]
        ).includes(strategy.address)
    );

  const EDITOR_EXECUTION_STRATEGIES = [
    {
      address: config.ExecutionStrategies.NoExecutionSimpleMajority,
      type: 'NoExecutionSimpleMajority',
      name: EXECUTORS.NoExecutionSimpleMajority,
      paramsDefinition: null
    },
    {
      address: config.ExecutionStrategies.EthRelayer,
      type: 'EthRelayer',
      name: EXECUTORS.EthRelayer,
      about:
        'An execution strategy that allows proposals to execute transactions from a specified target Avatar contract on L1, the most popular one being a Safe.',
      icon: IHUserCircle,
      generateSummary: (params: Record<string, any>) =>
        `(${params.quorum}, ${shorten(params.contractAddress)})`,
      deployNetworkId: baseNetworkId,
      deployConnectors: EVM_CONNECTORS,
      deploy: async (
        client: clients.StarknetTx,
        web3: Web3Provider,
        controller: string,
        spaceAddress: string,
        params: Record<string, any>
      ): Promise<{ address: string; txId: string }> => {
        await verifyNetwork(web3, baseChainId);

        return client.deployL1AvatarExecution({
          signer: web3.getSigner(),
          params: {
            controller: params.l1Controller,
            target: params.contractAddress,
            executionRelayer: config.ExecutionStrategies.EthRelayer,
            spaces: [spaceAddress],
            quorum: BigInt(params.quorum)
          }
        });
      },
      paramsDefinition: {
        type: 'object',
        title: 'Params',
        additionalProperties: false,
        required: ['l1Controller', 'quorum', 'contractAddress'],
        properties: {
          l1Controller: {
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
    }
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
    EDITOR_VOTING_TYPES,
    STORAGE_PROOF_STRATEGIES_TYPES
  };
}
