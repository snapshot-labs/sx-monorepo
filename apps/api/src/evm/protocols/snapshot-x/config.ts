import { CheckpointConfig } from '@snapshot-labs/checkpoint';
import { evmNetworks } from '@snapshot-labs/sx';
import L1AvatarExecutionStrategy from './abis/L1AvatarExecutionStrategy';
import L1AvatarExecutionStrategyFactory from './abis/L1AvatarExecutionStrategyFactory';
import ProxyFactory from './abis/ProxyFactory';
import SimpleQuorumAvatarExecutionStrategy from './abis/SimpleQuorumAvatarExecutionStrategy';
import SimpleQuorumTimelockExecutionStrategy from './abis/SimpleQuorumTimelockExecutionStrategy';
import Space from './abis/Space';
import { MANA_URL } from '../../../config';
import { NetworkID, SnapshotXConfig } from '../../types';

// Override `basesep` start block via env (for testing — skip historical replay
// and pick up only fresh proposals/votes). Numeric block height. Falls back to
// the Phase-0 demo deploy block when unset.
const BASESEP_START_BLOCK_ENV = process.env.BASESEP_START_BLOCK;
// Reveal/execute-split stack deploy block.
const BASESEP_DEFAULT_START = 42969459;

const START_BLOCKS: Record<NetworkID, number> = {
  eth: 18962278,
  sep: 4519171,
  oeth: 118359200,
  matic: 50858232,
  arb1: 157825417,
  base: 23524251,
  mnt: 75662182,
  bnb: Infinity,
  bnbt: Infinity,
  ape: 12100384,
  curtis: 16682282,
  // Inco demo deploy on Base Sepolia (see INTEGRATION_PROGRESS.md §7). Override
  // with `BASESEP_START_BLOCK=<current-head>` to skip the replay during tests.
  basesep: BASESEP_START_BLOCK_ENV
    ? Number(BASESEP_START_BLOCK_ENV)
    : BASESEP_DEFAULT_START
};

// Backfill for hand-deployed (non-factory) Inco Spaces.
const STATIC_INCO_SPACES: Partial<Record<NetworkID, string[]>> = {};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Subscribed for every Space proxy. The legacy `VoteCast`/`VoteCastWithMetadata`
// (with `uint8 choice`) and the Inco-flavored choice-less variants live side by
// side here — they have different topic-0 hashes, so they don't collide. Lifted
// so static-source Spaces (Inco demo on Base Sepolia) can reuse the exact same
// subscription list as the templated `Space` source.
const SPACE_TEMPLATE_EVENTS = [
  {
    name: 'SpaceCreated(address,(address,uint32,uint32,uint32,(address,bytes),string,string,string,(address,bytes)[],string[],address[]))',
    fn: 'handleSpaceCreated'
  },
  { name: 'MetadataURIUpdated(string)', fn: 'handleMetadataUriUpdated' },
  {
    name: 'MinVotingDurationUpdated(uint32)',
    fn: 'handleMinVotingDurationUpdated'
  },
  {
    name: 'MaxVotingDurationUpdated(uint32)',
    fn: 'handleMaxVotingDurationUpdated'
  },
  { name: 'VotingDelayUpdated(uint32)', fn: 'handleVotingDelayUpdated' },
  {
    name: 'OwnershipTransferred(address,address)',
    fn: 'handleOwnershipTransferred'
  },
  { name: 'AuthenticatorsAdded(address[])', fn: 'handleAuthenticatorsAdded' },
  {
    name: 'AuthenticatorsRemoved(address[])',
    fn: 'handleAuthenticatorsRemoved'
  },
  {
    name: 'VotingStrategiesAdded((address,bytes)[],string[])',
    fn: 'handleVotingStrategiesAdded'
  },
  {
    name: 'VotingStrategiesRemoved(uint8[])',
    fn: 'handleVotingStrategiesRemoved'
  },
  {
    name: 'ProposalValidationStrategyUpdated((address,bytes),string)',
    fn: 'handleProposalValidationStrategyUpdated'
  },
  {
    name: 'ProposalCreated(uint256,address,(address,uint32,address,uint32,uint32,uint8,bytes32,uint256),string,bytes)',
    fn: 'handleProposalCreated'
  },
  { name: 'ProposalCancelled(uint256)', fn: 'handleProposalCancelled' },
  {
    name: 'ProposalUpdated(uint256,(address,bytes),string)',
    fn: 'handleProposalUpdated'
  },
  { name: 'ProposalExecuted(uint256)', fn: 'handleProposalExecuted' },
  // Inco confidential reveal; no-op on legacy chains.
  {
    name: 'ProposalResultRevealed(uint256,uint256,uint256,uint256,bool)',
    fn: 'handleProposalResultRevealed'
  },
  // Legacy plaintext-choice VoteCasts.
  { name: 'VoteCast(uint256,address,uint8,uint256)', fn: 'handleVoteCast' },
  {
    name: 'VoteCastWithMetadata(uint256,address,uint8,uint256,string)',
    fn: 'handleVoteCast'
  },
  // Inco confidential VoteCasts (no `choice` arg). Different topic-0 → no
  // collision with the legacy variants.
  {
    name: 'VoteCast(uint256,address,uint256)',
    fn: 'handleConfidentialVoteCast'
  },
  {
    name: 'VoteCastWithMetadata(uint256,address,uint256,string)',
    fn: 'handleConfidentialVoteCast'
  }
];

type Config = Pick<CheckpointConfig, 'sources' | 'templates' | 'abis'> & {
  protocolConfig: SnapshotXConfig;
};

export function createConfig(networkId: NetworkID): Config {
  const network = evmNetworks[networkId];

  const sources: NonNullable<CheckpointConfig['sources']> = [];

  // Skip the factory subscription when there's no factory — Inco-flavored
  // networks (e.g. Base Sepolia) deploy the Space directly. Demo Spaces are
  // sourced via STATIC_INCO_SPACES below instead.
  if (network.Meta.proxyFactory && network.Meta.proxyFactory !== ZERO_ADDRESS) {
    sources.push({
      contract: network.Meta.proxyFactory,
      start: START_BLOCKS[networkId],
      abi: 'ProxyFactory',
      events: [
        {
          name: 'ProxyDeployed(address,address)',
          fn: 'handleProxyDeployed'
        }
      ]
    });
  }

  // Static Space sources for chains without a proxy factory (Inco demo on
  // Base Sepolia). Each address is treated as if `executeTemplate('Space')`
  // had been called for it on its deploy block.
  for (const spaceAddress of STATIC_INCO_SPACES[networkId] ?? []) {
    sources.push({
      contract: spaceAddress,
      start: START_BLOCKS[networkId],
      abi: 'Space',
      events: SPACE_TEMPLATE_EVENTS
    });
  }

  if (networkId === 'sep') {
    sources.push({
      contract: '0x27981a29ec87f2fbf873a2dcb0325405648ffce1',
      start: 6106288,
      abi: 'L1AvatarExecutionStrategyFactory',
      events: [
        {
          name: 'ContractDeployed(address)',
          fn: 'handleL1AvatarExecutionContractDeployed'
        }
      ]
    });
  }

  return {
    sources,
    templates: {
      Space: {
        abi: 'Space',
        events: SPACE_TEMPLATE_EVENTS
      },
      SimpleQuorumTimelockExecutionStrategy: {
        abi: 'SimpleQuorumTimelockExecutionStrategy',
        events: [
          {
            name: 'ProposalExecuted(bytes32)',
            fn: 'handleTimelockProposalExecuted'
          },
          {
            name: 'ProposalVetoed(bytes32)',
            fn: 'handleTimelockProposalVetoed'
          },
          {
            name: 'QuorumUpdated(uint256)',
            fn: 'handleQuorumUpdated'
          }
        ]
      },
      SimpleQuorumAvatarExecutionStrategy: {
        abi: 'SimpleQuorumAvatarExecutionStrategy',
        events: [
          {
            name: 'QuorumUpdated(uint256)',
            fn: 'handleQuorumUpdated'
          }
        ]
      },
      L1AvatarExecutionStrategy: {
        abi: 'L1AvatarExecutionStrategy',
        events: [
          {
            name: 'ProposalExecuted(uint256,uint256)',
            fn: 'handleStarknetProposalExecuted'
          }
        ]
      }
    },
    abis: {
      ProxyFactory,
      Space,
      SimpleQuorumAvatarExecutionStrategy,
      SimpleQuorumTimelockExecutionStrategy,
      L1AvatarExecutionStrategy,
      L1AvatarExecutionStrategyFactory
    },
    protocolConfig: {
      chainId: network.Meta.eip712ChainId,
      manaRpcUrl: `${MANA_URL}/eth_rpc/${network.Meta.eip712ChainId}`,
      masterSpace: network.Meta.masterSpace,
      masterSimpleQuorumAvatar: network.ExecutionStrategies.SimpleQuorumAvatar,
      masterSimpleQuorumTimelock:
        network.ExecutionStrategies.SimpleQuorumTimelock,
      propositionPowerValidationStrategyAddress:
        network.ProposalValidations.VotingPower,
      apeGasStrategy:
        (network.Strategies as { ApeGas?: string | null }).ApeGas ?? null,
      apeGasStrategyDelay: 20 * 5 // 20 minutes, with 5 blocks per minute
    }
  };
}
