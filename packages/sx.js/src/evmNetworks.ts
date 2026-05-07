import { BigNumberish } from '@ethersproject/bignumber';
import { EvmNetworkConfig } from './types';

type AdditionalProperties = {
  blockTime: number;
  hasNonNativeBlockNumbers?: boolean;
  maxPriorityFeePerGas?: BigNumberish;
  authenticators?: Record<string, string>;
  strategies?: {
    ApeGas?: string;
  };
};

function createStandardConfig(
  eip712ChainId: number,
  additionalProperties: AdditionalProperties
) {
  const additionalAuthenticators = additionalProperties.authenticators || {};
  const additionalStrategies = additionalProperties.strategies || {};

  return {
    Meta: {
      eip712ChainId,
      maxPriorityFeePerGas: additionalProperties.maxPriorityFeePerGas,
      blockTime: additionalProperties.blockTime,
      hasNonNativeBlockNumbers: additionalProperties.hasNonNativeBlockNumbers,
      proxyFactory: '0x4B4F7f64Be813Ccc66AEFC3bFCe2baA01188631c',
      masterSpace: '0xC3031A7d3326E47D49BfF9D374d74f364B29CE4D'
    },
    Authenticators: {
      EthSig: '0x5f9B7D78c9a37a439D78f801E0E339C6E711e260',
      EthSigV2: '0x95CF9B585fDb12DeB78002B5643dFF8fe67a496D',
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
      SimpleQuorumTimelock: '0xf2A1C2f2098161af98b2Cc7E382AB7F3ba86Ebc4'
    }
  };
}

/**
 * Build a per-chain config for an Inco confidential-voting deployment. Mirrors
 * `createStandardConfig` but takes explicit addresses (Inco doesn't share a global
 * proxy/master deployment with the legacy SX networks). `EthSigV2` is intentionally
 * absent — the Inco deployments use the v1 sig authenticator.
 */
function createIncoConfig(
  eip712ChainId: number,
  additionalProperties: AdditionalProperties & {
    masterSpace: string;
    proxyFactory: string;
    authenticators: { EthSig: string; EthTx: string };
    strategies: { Vanilla: string };
    proposalValidations: { Vanilla: string };
    executionStrategies: { Vanilla: string };
  }
) {
  return {
    Meta: {
      eip712ChainId,
      maxPriorityFeePerGas: additionalProperties.maxPriorityFeePerGas,
      blockTime: additionalProperties.blockTime,
      hasNonNativeBlockNumbers: additionalProperties.hasNonNativeBlockNumbers,
      proxyFactory: additionalProperties.proxyFactory,
      masterSpace: additionalProperties.masterSpace,
      // Marker consumed by clients/UI to switch to encrypted-vote flow.
      confidential: true
    },
    Authenticators: {
      EthSig: additionalProperties.authenticators.EthSig,
      // Match the shape of standard configs for backwards-compat in callers
      // that key off `Authenticators.EthSigV2`. Inco doesn't have a v2 yet —
      // alias it to v1 so legacy lookups don't crash.
      EthSigV2: additionalProperties.authenticators.EthSig,
      EthTx: additionalProperties.authenticators.EthTx
    },
    Strategies: {
      Vanilla: additionalProperties.strategies.Vanilla,
      // Snapshot-X-canonical strategies aren't deployed on Inco yet. Use
      // distinct sentinel addresses so `createEvmConfig`'s type registry
      // doesn't collapse them onto the Vanilla address (which would otherwise
      // mis-register Vanilla as `type: 'whitelist'` due to last-write-wins on
      // the shared key).
      Comp: '0x0000000000000000000000000000000000000C01',
      OZVotes: '0x0000000000000000000000000000000000000c02',
      Whitelist: '0x0000000000000000000000000000000000000c03',
      ApeGas: undefined as string | undefined
    },
    ProposalValidations: {
      VotingPower: additionalProperties.proposalValidations.Vanilla
    },
    ExecutionStrategies: {
      SimpleQuorumAvatar: additionalProperties.executionStrategies.Vanilla,
      SimpleQuorumTimelock: additionalProperties.executionStrategies.Vanilla,
      Axiom: null,
      Isokratia: null
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
    [network.Authenticators.EthSigV2]: {
      type: 'ethSigV2'
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
    },
    ...(network.Strategies.ApeGas
      ? {
          [network.Strategies.ApeGas]: {
            type: 'apeGas' as const
          }
        }
      : {})
  } as const;

  const executionStrategiesImplementations = {
    SimpleQuorumAvatar: network.ExecutionStrategies.SimpleQuorumAvatar,
    SimpleQuorumTimelock: network.ExecutionStrategies.SimpleQuorumTimelock
  } as const;

  return {
    eip712ChainId: network.Meta.eip712ChainId,
    maxPriorityFeePerGas: network.Meta.maxPriorityFeePerGas,
    blockTime: network.Meta.blockTime,
    hasNonNativeBlockNumbers: network.Meta.hasNonNativeBlockNumbers,
    proxyFactory: network.Meta.proxyFactory,
    masterSpace: network.Meta.masterSpace,
    authenticators,
    strategies,
    executionStrategiesImplementations
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
  /**
   * Base Sepolia (chainId 84532) — Inco confidential voting reference deployment.
   *
   * NOT a generic SX deployment. The master Space and authenticators here are the
   * Inco-flavored variants (encrypted vote ciphertext + attested-decryption
   * `tryExecute`). The `confidential: true` Meta flag tells the SDK/UI to swap to
   * the encrypted-vote ABI and EIP-712 type.
   *
   * Addresses come from the most recent happy-path smoke deploy. There is no
   * proxy factory yet — Spaces are deployed directly, so `proxyFactory` is the
   * zero address. Replace with a Snapshot-team-blessed deployment once that
   * exists. See `INTEGRATION_PROGRESS.md` Section 7 for proof-of-deploy tx
   * hashes.
   */
  basesep: createIncoConfig(84532, {
    blockTime: 2,
    // Inco-flavored ProxyFactory deployed for the Base Sepolia reference (no
    // shared SX factory exists for Inco yet). Tx hash recorded in
    // INTEGRATION_PROGRESS.md §7.
    proxyFactory: '0x06a0c3B26C13B444fEdb3B2988892E359dCb8B06',
    masterSpace: '0xcb8eB47d52286c0fc1B5A0F4e0720f2E7db077Ac',
    authenticators: {
      EthSig: '0x009ABB61d7E868aEf944F133Ca104e24FC3D5162',
      EthTx: '0x67a7d86F6c8B3E7FF3063D26A28D58e989850e4D'
    },
    strategies: {
      Vanilla: '0x5513d0e1b3E273d9373f3D4Cfbb8f1940556EDd2'
    },
    proposalValidations: {
      Vanilla: '0x18aE195EaA8E8D9Cc387CC13Db5727357BF9f4d7'
    },
    executionStrategies: {
      Vanilla: '0x7Ddcb1F2Ca1b1079Ad4BeeA2aDD0A7D792e16143'
    }
  })
} as const;

export const evmMainnet = createEvmConfig('eth');
export const evmSepolia = createEvmConfig('sep');
export const evmOptimism = createEvmConfig('oeth');
export const evmPolygon = createEvmConfig('matic');
export const evmArbitrum = createEvmConfig('arb1');
export const evmBase = createEvmConfig('base');
export const evmMantle = createEvmConfig('mnt');
export const evmBnb = createEvmConfig('bnb');
export const evmBnbt = createEvmConfig('bnbt');
export const evmApe = createEvmConfig('ape');
export const evmCurtis = createEvmConfig('curtis');
export const evmBaseSepolia = createEvmConfig('basesep');
