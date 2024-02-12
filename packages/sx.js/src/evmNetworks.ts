import { EvmNetworkConfig } from './types';

type AdditionalProperties = {
  authenticators?: Record<string, string>;
  strategies?: Record<string, string>;
  executionStrategies?: Record<string, string>;
};

function createStandardConfig(
  eip712ChainId: number,
  additionalProperties: AdditionalProperties = {}
) {
  const additionalAuthenticators = additionalProperties.authenticators || {};
  const additionalStrategies = additionalProperties.strategies || {};
  const additionalExecutionStrategies = additionalProperties.executionStrategies || {};

  return {
    Meta: {
      eip712ChainId,
      proxyFactory: '0x4b4f7f64be813ccc66aefc3bfce2baa01188631c',
      masterSpace: '0xc3031a7d3326e47d49bff9d374d74f364b29ce4d'
    },
    Authenticators: {
      EthSig: '0x5f9b7d78c9a37a439d78f801e0e339c6e711e260',
      EthTx: '0xba06e6ccb877c332181a6867c05c8b746a21aed1',
      ...additionalAuthenticators
    },
    Strategies: {
      Vanilla: '0xc1245c5dca7885c73e32294140f1e5d30688c202',
      Comp: '0x0c2de612982efd102803161fc7c74cca15db932c',
      OZVotes: '0x2c8631584474e750cedf2fb6a904f2e84777aefe',
      Whitelist: '0x34f0afff5a739bbf3e285615f50e40ddaaf2a829',
      ...additionalStrategies
    },
    ProposalValidations: {
      VotingPower: '0x6d9d6d08ef6b26348bd18f1fc8d953696b7cf311'
    },
    ExecutionStrategies: {
      SimpleQuorumAvatar: '0xece4f6b01a2d7ff5a9765ca44162d453fc455e42',
      SimpleQuorumTimelock: '0xf2a1c2f2098161af98b2cc7e382ab7f3ba86ebc4',
      Axiom: null,
      Isokratia: null,
      ...additionalExecutionStrategies
    }
  };
}

function createStarknetConfig(networkId: keyof typeof evmNetworks): EvmNetworkConfig {
  const network = evmNetworks[networkId];

  const authenticators = {
    [network.Authenticators.EthSig]: {
      type: 'ethSig'
    },
    [network.Authenticators.EthTx]: {
      type: 'ethTx'
    }
  } as const;

  const strategies = {
    [network.Strategies.Vanilla]: {
      type: 'vanilla'
    },
    [network.Strategies.Comp]: {
      type: 'comp'
    },
    [network.Strategies.OZVotes]: {
      type: 'ozVotes'
    },
    [network.Strategies.Whitelist]: {
      type: 'whitelist'
    }
  } as const;

  const executionStrategiesImplementations = {
    SimpleQuorumAvatar: network.ExecutionStrategies.SimpleQuorumAvatar,
    SimpleQuorumTimelock: network.ExecutionStrategies.SimpleQuorumTimelock,
    ...(network.ExecutionStrategies.Axiom ? { Axiom: network.ExecutionStrategies.Axiom } : {}),
    ...(network.ExecutionStrategies.Isokratia
      ? { Isokratia: network.ExecutionStrategies.Isokratia }
      : {})
  } as const;

  return {
    eip712ChainId: network.Meta.eip712ChainId,
    proxyFactory: network.Meta.proxyFactory,
    masterSpace: network.Meta.masterSpace,
    authenticators,
    strategies,
    executionStrategiesImplementations
  };
}

export const evmNetworks = {
  eth: createStandardConfig(1),
  gor: createStandardConfig(5),
  sep: createStandardConfig(11155111, {
    strategies: {
      Axiom: '0xE59405D7d40df064E85FD02a4F2F2C527172a9c1',
      Isokratia: '0xc674eCf233920aa3052738BFCDbDd0812AEE5A83'
    }
  }),
  matic: createStandardConfig(137),
  arb1: createStandardConfig(42161),
  'linea-testnet': {
    Meta: {
      eip712ChainId: 59140,
      proxyFactory: '0x12a1fffffd70677939d61d641ea043bc9060c718',
      masterSpace: '0x7cc62f8e9bf2b44ce704d2cdcd4aa8021d5a6f4b'
    },
    Authenticators: {
      EthSig: '0x3e3a68e0e70dbf78051109a9f379b7a7adec82f4',
      EthTx: '0xddb36b865a1021524b936fb29fcba5fac073db74'
    },
    Strategies: {
      Vanilla: '0xeba53160c146cbf77a150e9a218d4c2de5db6b51',
      Comp: '0x343baf4b44f7f79b14301cfa8068e3f8be7470de',
      OZVotes: '0x4aaa33b4367dc5657854bd40738201651ec0cc7b',
      Whitelist: '0x54449c058bbf0b777745944ea1a7b79786fbc958'
    },
    ProposalValidations: {
      VotingPower: '0x6d9d6d08ef6b26348bd18f1fc8d953696b7cf311'
    },
    ExecutionStrategies: {
      SimpleQuorumAvatar: '0x177f163f8f789f0d9c5c7993728adb106a7b12d4',
      SimpleQuorumTimelock: '0xdb86512e7e3a2d0b93b74b8fe3ffe8ad780791be',
      Axiom: null,
      Isokratia: null
    }
  }
} as const;

export const evmMainnet = createStarknetConfig('eth');
export const evmGoerli = createStarknetConfig('gor');
export const evmSepolia = createStarknetConfig('sep');
export const evmPolygon = createStarknetConfig('matic');
export const evmArbitrum = createStarknetConfig('arb1');
export const evmLineaGoerli = createStarknetConfig('linea-testnet');
