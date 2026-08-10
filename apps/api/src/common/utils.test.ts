import { describe, expect, it } from 'vitest';
import { getSpaceMetadataId } from './utils';

describe('getSpaceMetadataId', () => {
  it('strips the ipfs scheme', () => {
    expect(getSpaceMetadataId('ipfs://bafyMetadata')).toEqual('bafyMetadata');
  });

  it('keeps a uri that is not ipfs as is', () => {
    expect(getSpaceMetadataId('https://example.com/space.json')).toEqual(
      'https://example.com/space.json'
    );
  });

  it('is null for a blank uri', () => {
    expect(getSpaceMetadataId('')).toBeNull();
  });
});
