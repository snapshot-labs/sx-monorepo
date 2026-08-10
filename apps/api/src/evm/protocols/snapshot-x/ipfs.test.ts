import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleSpaceMetadata } from './ipfs';

const mocks = vi.hoisted(() => ({
  created: [] as { id: string; save: ReturnType<typeof vi.fn> }[],
  loadEntity: vi.fn(async (): Promise<unknown> => null),
  fetch: vi.fn()
}));

vi.mock('../../../../.checkpoint/models', () => {
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

  class Network {}
  class Proposal {}
  class ScoresTick {}

  return { SpaceMetadataItem, Network, Proposal, ScoresTick };
});

const SPACE = '0xe44a9c5670Ce7C3675f389785E0C565e52730377';

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

  // A space can be deployed with a blank metadataURI. There is no metadata to
  // index for it, and `dropIpfs('')` is `''`, an id shared by every such space
  // on the indexer, so nothing should be written at all.
  it('writes nothing for a blank uri', async () => {
    const item = await handleSpaceMetadata(SPACE, '', 'eth');

    expect(item).toBeUndefined();
    expect(mocks.created).toHaveLength(0);
    expect(mocks.loadEntity).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('keys the metadata item on the cid', async () => {
    await handleSpaceMetadata(SPACE, 'ipfs://bafyMetadata', 'eth');

    expect(mocks.created).toHaveLength(1);
    expect(mocks.created[0]?.id).toEqual('bafyMetadata');
    expect(mocks.created[0]?.save).toHaveBeenCalled();
  });

  it('reuses an already indexed metadata item', async () => {
    mocks.loadEntity.mockResolvedValue({ id: 'bafyMetadata' });

    const item = await handleSpaceMetadata(SPACE, 'ipfs://bafyMetadata', 'eth');

    expect(item).toBeUndefined();
    expect(mocks.created).toHaveLength(0);
  });
});
