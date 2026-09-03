import { BigNumberish } from '@ethersproject/bignumber';
import { buildRegistry } from './registry';
import { EvmNetworkConfig } from './types';

export type ProtocolID = 'snapshot-x' | 'snapshot-x-inco';

type AddressOverride = string | null;

type Overrides = {
  blockTime: number;
  hasNonNativeBlockNumbers?: boolean;
  maxPriorityFeePerGas?: BigNumberish;
  proxyFactory?: string;
  masterSpace?: string;
  incoProxyFactory?: string;
  incoMasterSpace?: string;
  authenticators?: {
    EthSig?: AddressOverride;
    EthSigV2?: AddressOverride;
    EthTx?: AddressOverride;
    IncoEthTx?: string;
  };
  strategies?: {
    Vanilla?: AddressOverride;
    Comp?: AddressOverride;
    OZVotes?: AddressOverride;
    Whitelist?: AddressOverride;
    ApeGas?: string;
  };
  proposalValidations?: {
    Vanilla?: string;
    VotingPower?: AddressOverride;
  };
  executionStrategies?: {
    IncoSimpleQuorumVanilla?: string;
    SimpleQuorumAvatar?: AddressOverride;
    SimpleQuorumTimelock?: AddressOverride;
  };
};

function resolveAddress(
  override: AddressOverride | undefined,
  defaultAddress: string
): string | undefined {
  if (override === null) return undefined;

  return override ?? defaultAddress;
}

export function createStandardConfig(
  eip712ChainId: number,
  overrides: Overrides
) {
  const {
    authenticators = {},
    strategies = {},
    proposalValidations = {},
    executionStrategies = {}
  } = overrides;

  return {
    Meta: {
      eip712ChainId,
      maxPriorityFeePerGas: overrides.maxPriorityFeePerGas,
      blockTime: overrides.blockTime,
      hasNonNativeBlockNumbers: overrides.hasNonNativeBlockNumbers,
      proxyFactory:
        overrides.proxyFactory ?? '0x4B4F7f64Be813Ccc66AEFC3bFCe2baA01188631c',
      masterSpace:
        overrides.masterSpace ?? '0xC3031A7d3326E47D49BfF9D374d74f364B29CE4D',
      incoProxyFactory: overrides.incoProxyFactory,
      incoMasterSpace: overrides.incoMasterSpace
    },
    Authenticators: {
      EthSig: resolveAddress(
        authenticators.EthSig,
        '0x5f9B7D78c9a37a439D78f801E0E339C6E711e260'
      ),
      EthSigV2: resolveAddress(
        authenticators.EthSigV2,
        '0x95CF9B585fDb12DeB78002B5643dFF8fe67a496D'
      ),
      EthTx: resolveAddress(
        authenticators.EthTx,
        '0xBA06E6cCb877C332181A6867c05c8b746A21Aed1'
      ),
      IncoEthTx: authenticators.IncoEthTx
    },
    Strategies: {
      Vanilla: resolveAddress(
        strategies.Vanilla,
        '0xC1245C5DCa7885C73E32294140F1e5d30688c202'
      ),
      Comp: resolveAddress(
        strategies.Comp,
        '0x0c2De612982Efd102803161fc7C74CcA15Db932c'
      ),
      OZVotes: resolveAddress(
        strategies.OZVotes,
        '0x2c8631584474E750CEdF2Fb6A904f2e84777Aefe'
      ),
      Whitelist: resolveAddress(
        strategies.Whitelist,
        '0x34f0AfFF5A739bBf3E285615F50e40ddAaf2A829'
      ),
      ApeGas: strategies.ApeGas
    },
    ProposalValidations: {
      Vanilla: proposalValidations.Vanilla,
      VotingPower: resolveAddress(
        proposalValidations.VotingPower,
        '0x6D9d6D08EF6b26348Bd18F1FC8D953696b7cf311'
      )
    },
    ExecutionStrategies: {
      IncoSimpleQuorumVanilla: executionStrategies.IncoSimpleQuorumVanilla,
      SimpleQuorumAvatar: resolveAddress(
        executionStrategies.SimpleQuorumAvatar,
        '0xecE4f6b01a2d7FF5A9765cA44162D453fC455e42'
      ),
      SimpleQuorumTimelock: resolveAddress(
        executionStrategies.SimpleQuorumTimelock,
        '0xf2A1C2f2098161af98b2Cc7E382AB7F3ba86Ebc4'
      )
    }
  };
}

export function createEvmConfig(
  network: ReturnType<typeof createStandardConfig>
): EvmNetworkConfig {
  return {
    eip712ChainId: network.Meta.eip712ChainId,
    maxPriorityFeePerGas: network.Meta.maxPriorityFeePerGas,
    blockTime: network.Meta.blockTime,
    hasNonNativeBlockNumbers: network.Meta.hasNonNativeBlockNumbers,
    proxyFactory: network.Meta.proxyFactory,
    masterSpace: network.Meta.masterSpace,
    authenticators: buildRegistry([
      [network.Authenticators.EthSig, { type: 'ethSig' }],
      [network.Authenticators.EthSigV2, { type: 'ethSigV2' }],
      [network.Authenticators.EthTx, { type: 'ethTx' }],
      [network.Authenticators.IncoEthTx, { type: 'ethTx' }]
    ]),
    strategies: buildRegistry([
      [network.Strategies.Vanilla, { type: 'vanilla' }],
      [network.Strategies.Comp, { type: 'comp' }],
      [network.Strategies.OZVotes, { type: 'ozVotes' }],
      [network.Strategies.Whitelist, { type: 'whitelist' }],
      [network.Strategies.ApeGas, { type: 'apeGas' }]
    ]),
    executionStrategiesImplementations: {
      SimpleQuorumAvatar: network.ExecutionStrategies.SimpleQuorumAvatar,
      SimpleQuorumTimelock: network.ExecutionStrategies.SimpleQuorumTimelock
    }
  };
}

const ethMainnetBlockTime = 12;
const ethSepoliaBlockTime = 12;

export const evmNetworks = {
  eth: createStandardConfig(1, { blockTime: ethMainnetBlockTime }),
  oeth: createStandardConfig(10, { blockTime: 2 }),
  sep: createStandardConfig(11155111, {
    blockTime: ethSepoliaBlockTime
  }),
  matic: createStandardConfig(137, { blockTime: 2 }),
  arb1: createStandardConfig(42161, {
    blockTime: ethMainnetBlockTime,
    hasNonNativeBlockNumbers: true
  }),
  base: createStandardConfig(8453, { blockTime: 2 }),
  bnb: createStandardConfig(56, {
    blockTime: 0.45
  }),
  bnbt: createStandardConfig(97, {
    blockTime: 0.45
  }),
  mnt: createStandardConfig(5000, {
    blockTime: 2,
    // https://docs.mantle.xyz/network/system-information/fee-mechanism/eip-1559-support#application-of-eip-1559-in-mantle-v2-tectonic
    maxPriorityFeePerGas: 0
  }),
  ape: createStandardConfig(33139, {
    blockTime: ethMainnetBlockTime,
    hasNonNativeBlockNumbers: true,
    strategies: {
      ApeGas: '0xDd6B74123b2aB93aD701320D3F8D1b92B4fA5202'
    }
  }),
  curtis: createStandardConfig(33111, {
    blockTime: ethSepoliaBlockTime,
    hasNonNativeBlockNumbers: true,
    strategies: {
      ApeGas: '0x8E7083D3D0174Fe7f33821b2b4bDFE0fEE9C8e87'
    }
  }),
  basesep: createStandardConfig(84532, {
    blockTime: 2,
    incoProxyFactory: '0xfDe801CFc7f9a931eB1CF026e60B08a366B13494',
    incoMasterSpace: '0x3F31D742D3158b07434A041e26B47e9EB94e010C',
    authenticators: {
      EthSig: null,
      EthSigV2: null,
      EthTx: null,
      IncoEthTx: '0x9376EFC993DC6Ac09044300f26e015890bf97C17'
    },
    strategies: {
      Vanilla: '0xc501B2057E60CfD31559e4FD1e3134aF0BA9C673',
      Comp: null,
      OZVotes: null,
      Whitelist: null
    },
    proposalValidations: {
      Vanilla: '0x8141C869D63f41Fd6759c12e2fDA019E3b9A28C6',
      VotingPower: null
    },
    executionStrategies: {
      IncoSimpleQuorumVanilla: '0xe03ED076c98095BDE288Cb78730365786e2Caab3',
      SimpleQuorumAvatar: null,
      SimpleQuorumTimelock: null
    }
  })
} as const;

export const evmMainnet = createEvmConfig(evmNetworks.eth);
export const evmSepolia = createEvmConfig(evmNetworks.sep);
export const evmOptimism = createEvmConfig(evmNetworks.oeth);
export const evmPolygon = createEvmConfig(evmNetworks.matic);
export const evmArbitrum = createEvmConfig(evmNetworks.arb1);
export const evmBase = createEvmConfig(evmNetworks.base);
export const evmMantle = createEvmConfig(evmNetworks.mnt);
export const evmBnb = createEvmConfig(evmNetworks.bnb);
export const evmBnbt = createEvmConfig(evmNetworks.bnbt);
export const evmApe = createEvmConfig(evmNetworks.ape);
export const evmCurtis = createEvmConfig(evmNetworks.curtis);
export const evmBaseSepolia = createEvmConfig(evmNetworks.basesep);
