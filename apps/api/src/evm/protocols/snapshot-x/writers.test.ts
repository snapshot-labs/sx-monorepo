import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as snapshotXUtils from './utils';
import { createWriters } from './writers';
import * as commonUtils from '../../../common/utils';
import { EVMConfig, SnapshotXConfig } from '../../types';

const mocks = vi.hoisted(() => ({
  spaces: [] as Record<string, unknown>[],
  handleSpaceMetadata: vi.fn(),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
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

vi.mock('./logger', () => ({ default: mocks.logger }));

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
  indexerName: 'base',
  network_node_url: 'https://rpc.invalid'
} as unknown as EVMConfig;

const protocolConfig = {
  chainId: 8453,
  manaRpcUrl: 'https://mana.invalid',
  masterSpace: '0x0000000000000000000000000000000000000001',
  masterSimpleQuorumAvatar: null,
  masterSimpleQuorumTimelock: null,
  propositionPowerValidationStrategyAddress: null,
  apeGasStrategy: null,
  apeGasStrategyDelay: 0
} satisfies SnapshotXConfig as SnapshotXConfig;

const SPACE = '0x59396568e4eF96801F9F771bF8247Fe1442d6B42';

async function handleSpaceCreated() {
  const writers = createWriters(config, protocolConfig);

  await writers.handleSpaceCreated({
    block: { timestamp: 1762399613 },
    blockNumber: 1,
    txId: '0xtx',
    // The writer only reads the fields set here. Checkpoint hands it a much
    // wider payload that is irrelevant to this path.
    event: {
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
          metadataURI: 'ipfs://QmY9SU6dap8ExQsd9CVb1XPgzZymmojnMAMpQ1eitBAAUc',
          votingStrategies: [],
          votingStrategyMetadataURIs: [],
          authenticators: []
        }
      }
    }
  } as unknown as Parameters<typeof writers.handleSpaceCreated>[0]);

  return mocks.spaces.at(-1);
}

describe('handleSpaceCreated', () => {
  beforeEach(() => {
    mocks.spaces.length = 0;
    mocks.handleSpaceMetadata.mockReset();
    mocks.logger.info.mockReset();
    mocks.logger.warn.mockReset();
    mocks.logger.error.mockReset();
  });

  // The space is still saved when its metadata cannot be fetched, with a null
  // pointer that nothing revisits. Logging that below error hid it from
  // alerting, so spaces went missing with no signal at all.
  it('reports a metadata fetch failure at error level', async () => {
    mocks.handleSpaceMetadata.mockRejectedValue(new Error('gateway down'));

    const space = await handleSpaceCreated();

    expect(space?.metadata).toBeNull();
    expect(space?.save).toHaveBeenCalled();
    expect(mocks.logger.error).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      'Failed to fetch space metadata'
    );
  });

  it('says nothing when the metadata resolves', async () => {
    mocks.handleSpaceMetadata.mockResolvedValue(undefined);

    const space = await handleSpaceCreated();

    expect(space?.metadata).toEqual(
      'QmY9SU6dap8ExQsd9CVb1XPgzZymmojnMAMpQ1eitBAAUc'
    );
    expect(mocks.logger.error).not.toHaveBeenCalled();
  });
});
