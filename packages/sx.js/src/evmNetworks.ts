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
  const additionalExecutionStrategies =
    additionalProperties.executionStrategies || {};

  return {
    Meta: {
      eip712ChainId,
      proxyFactory: '0x4B4F7f64Be813Ccc66AEFC3bFCe2baA01188631c',
      masterSpace: '0xC3031A7d3326E47D49BfF9D374d74f364B29CE4D'
    },
    Authenticators: {
      EthSig: '0x5f9B7D78c9a37a439D78f801E0E339C6E711e260',
      EthTx: '0xBA06E6cCb877C332181A6867c05c8b746A21Aed1',
      ...additionalAuthenticators
    },
    Strategies: {
      Vanilla: '0xC1245C5DCa7885C73E32294140F1e5d30688c202',
      Comp: '0x0c2De612982Efd102803161fc7C74CcA15Db932c',
      OZVotes: '0x2c8631584474E750CEdF2Fb6A904f2e84777Aefe',
      Whitelist: '0x34f0AfFF5A739bBf3E285615F50e40ddAaf2A829',
      ...additionalStrategies
    },
    ProposalValidations: {
      VotingPower: '0x6D9d6D08EF6b26348Bd18F1FC8D953696b7cf311'
    },
    ExecutionStrategies: {
      SimpleQuorumAvatar: '0xecE4f6b01a2d7FF5A9765cA44162D453fC455e42',
      SimpleQuorumTimelock: '0xf2A1C2f2098161af98b2Cc7E382AB7F3ba86Ebc4',
      Axiom: null,
      Isokratia: null,
      ...additionalExecutionStrategies
    }
  };
}

function createEvmConfig(
  networkId: keyof typeof evmNetworks
): EvmNetworkConfig {
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
    ...(network.ExecutionStrategies.Axiom
      ? { Axiom: network.ExecutionStrategies.Axiom }
      : {}),
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
  oeth: createStandardConfig(10),
  sep: createStandardConfig(11155111, {
    executionStrategies: {
      Axiom: '0xaC6dbd42Ed254E9407fe0D2798784d0110979DC2',
      Isokratia: '0xc674eCf233920aa3052738BFCDbDd0812AEE5A83'
    }
  }),
  matic: createStandardConfig(137),
  arb1: createStandardConfig(42161)
} as const;

export const evmMainnet = createEvmConfig('eth');
export const evmSepolia = createEvmConfig('sep');
export const evmOptimism = createEvmConfig('oeth');
export const evmPolygon = createEvmConfig('matic');
export const evmArbitrum = createEvmConfig('arb1');
