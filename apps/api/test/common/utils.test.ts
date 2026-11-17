import { describe, expect, it } from 'vitest';
import { getSpaceMetadataId } from '../../src/common/utils';

describe('getSpaceMetadataId', () => {
  const space = '0x58663D02B1EEa56215aa8fB45D78368E5C8586d6';

  it('should return the metadata URI without the ipfs:// prefix', () => {
    expect(
      getSpaceMetadataId(
        space,
        'ipfs://bafkreiejquvstmy3ahn4ss7l3uoagjs7msvbb76su6bkoobuqejns3qkym'
      )
    ).toBe('bafkreiejquvstmy3ahn4ss7l3uoagjs7msvbb76su6bkoobuqejns3qkym');
  });

  it('should return the space address when there is no metadata URI', () => {
    expect(getSpaceMetadataId(space, '')).toBe(space);
  });
});
