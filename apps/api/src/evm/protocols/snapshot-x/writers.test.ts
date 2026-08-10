import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as snapshotXUtils from './utils';
import { createWriters } from './writers';
import * as commonUtils from '../../../common/utils';
import { EVMConfig, SnapshotXConfig } from '../../types';

const mocks = vi.hoisted(() => ({
  spaces: [] as Record<string, unknown>[],
  handleSpaceMetadata: vi.fn(async () => undefined)
}));

vi.mock('../../../../.checkpoint/models', () => {
  class Space {
    save = vi.fn(async () => {});

    constructor(
      public id: string,
      public indexerName: string
    ) {
      mocks.spaces.push(this as unknown as Record<string, unknown>);
    }

    static loadEntity = vi.fn(async () => null);
  }

  class Entity {
    save = vi.fn(async () => {});
    static loadEntity = vi.fn(async () => null);
  }

  return {
    ExecutionHash: Entity,
    ExecutionStrategy: Entity,
    Leaderboard: Entity,
    Network: Entity,
    Proposal: Entity,
    ScoresTick: Entity,
    Space,
    SpaceMetadataItem: Entity,
    StarknetL1Execution: Entity,
    User: Entity,
    Vote: Entity
  };
});

vi.mock('./ipfs', () => ({ handleSpaceMetadata: mocks.handleSpaceMetadata }));

vi.mock('./logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

vi.mock('./utils', async importOriginal => ({
  ...(await importOriginal<typeof snapshotXUtils>()),
  handleCustomExecutionStrategy: vi.fn(async () => {}),
  updateProposalValidationStrategy: vi.fn(async () => {})
}));

vi.mock('../../../common/ipfs', () => ({
  handleProposalMetadata: vi.fn(async () => {}),
  handleStrategiesMetadata: vi.fn(async () => ({ strategiesDecimals: [] })),
  handleVoteMetadata: vi.fn(async () => {})
}));

vi.mock('../../../common/utils', async importOriginal => ({
  ...(await importOriginal<typeof commonUtils>()),
  updateCounter: vi.fn(async () => {}),
  updateScoresTick: vi.fn(async () => {})
}));

const config = {
  indexerName: 'eth',
  network_node_url: 'https://rpc.invalid'
} as unknown as EVMConfig;

const protocolConfig = {
  chainId: 1,
  manaRpcUrl: 'https://mana.invalid',
  masterSpace: '0x0000000000000000000000000000000000000001',
  masterSimpleQuorumAvatar: null,
  masterSimpleQuorumTimelock: null,
  propositionPowerValidationStrategyAddress: null,
  apeGasStrategy: null,
  apeGasStrategyDelay: 0
} satisfies SnapshotXConfig as SnapshotXConfig;

const SPACE = '0xe44a9c5670Ce7C3675f389785E0C565e52730377';

function createSpaceCreatedEvent(metadataURI: string) {
  return {
    args: {
      space: SPACE,
      input: {
        owner: '0x220bc93D88C0aF11f1159eA89a885d5ADd3A7Cf6',
        votingDelay: 0,
        minVotingDuration: 0,
        maxVotingDuration: 86400,
        proposalValidationStrategy: {
          addr: '0x0000000000000000000000000000000000000002',
          params: '0x'
        },
        proposalValidationStrategyMetadataURI: '',
        daoURI: '',
        metadataURI,
        votingStrategies: [],
        votingStrategyMetadataURIs: [],
        authenticators: []
      }
    }
  };
}

async function handleSpaceCreated(metadataURI: string) {
  const writers = createWriters(config, protocolConfig);

  await writers.handleSpaceCreated({
    block: { timestamp: 1784649731 },
    blockNumber: 1,
    txId: '0xtx',
    event: createSpaceCreatedEvent(metadataURI)
    // The writer only reads the fields set above. Checkpoint hands it a much
    // wider payload that is irrelevant here.
  } as unknown as Parameters<typeof writers.handleSpaceCreated>[0]);

  return mocks.spaces.at(-1);
}

describe('handleSpaceCreated', () => {
  beforeEach(() => {
    mocks.spaces.length = 0;
    mocks.handleSpaceMetadata.mockClear();
  });

  // Two spaces on eth were deployed with a blank metadataURI. `dropIpfs('')` is
  // `''`, so they were saved pointing at a metadata item that no space should
  // own, and the relation resolver blew up on it rather than returning null.
  it('leaves metadata null when the space has no metadata uri', async () => {
    const space = await handleSpaceCreated('');

    expect(space?.metadata).toBeNull();
    expect(space?.save).toHaveBeenCalled();
  });

  it('points metadata at the cid when the space has a metadata uri', async () => {
    const space = await handleSpaceCreated('ipfs://bafyMetadata');

    expect(space?.metadata).toEqual('bafyMetadata');
  });
});
