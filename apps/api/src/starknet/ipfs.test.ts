import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FullConfig } from './config';
import { handleSpaceMetadata } from './ipfs';

const mocks = vi.hoisted(() => ({
  created: [] as { id: string; save: ReturnType<typeof vi.fn> }[],
  loadEntity: vi.fn(async (): Promise<unknown> => null),
  fetch: vi.fn()
}));

vi.mock('../../.checkpoint/models', () => {
  class SpaceMetadataItem {
    static loadEntity = mocks.loadEntity;
    save = vi.fn(async () => {});

    constructor(
      public id: string,
      public indexerName: string
    ) {
      mocks.created.push(this);
    }
  }

  class ExecutionStrategy {
    static loadEntity = vi.fn(async () => null);
    save = vi.fn(async () => {});
  }

  class Network {}
  class Proposal {}
  class ScoresTick {}

  return {
    ExecutionStrategy,
    SpaceMetadataItem,
    Network,
    Proposal,
    ScoresTick
  };
});

const SPACE =
  '0x00c5a04db85c8fcf70efb69d0b929e0b128021a5bcf3c6e447174941324f68e0';

const config = { indexerName: 'sn' } as FullConfig;

describe('handleSpaceMetadata', () => {
  beforeEach(() => {
    mocks.created.length = 0;
    mocks.loadEntity.mockClear();
    mocks.loadEntity.mockResolvedValue(null);
    mocks.fetch.mockReset();
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ name: 'Radish DAO' })
    });
    vi.stubGlobal('fetch', mocks.fetch);
  });

  // A space can be deployed with a blank metadata uri. There is no metadata to
  // index for it, and `dropIpfs('')` is `''`, an id shared by every such space
  // on the indexer, so nothing should be written at all.
  it('writes nothing for a blank uri', async () => {
    await handleSpaceMetadata(SPACE, '', config);

    expect(mocks.created).toHaveLength(0);
    expect(mocks.loadEntity).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('keys the metadata item on the cid', async () => {
    await handleSpaceMetadata(SPACE, 'ipfs://bafyMetadata', config);

    expect(mocks.created).toHaveLength(1);
    expect(mocks.created[0]?.id).toEqual('bafyMetadata');
    expect(mocks.created[0]?.save).toHaveBeenCalled();
  });
});
