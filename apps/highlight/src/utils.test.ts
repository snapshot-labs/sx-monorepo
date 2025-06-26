import { describe, expect, it } from 'vitest';
import { getUrl } from './utils';

describe('getUrl', () => {
  it('should return correct url', () => {
    const url = getUrl('ipfs://QmSxCmrM1RuLGWGv5acvu7sN2SmhV9dZQ3E6EG6k2HyXcu');

    expect(url).toBe(
      'https://pineapple.fyi/ipfs/QmSxCmrM1RuLGWGv5acvu7sN2SmhV9dZQ3E6EG6k2HyXcu'
    );
  });
});
