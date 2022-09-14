import { getStrategy } from '../../../src/strategies';

describe('strategies', () => {
  describe('getAuthenticator', () => {
    it('should return correct authenticator with predefined addresses', () => {
      expect(
        getStrategy('0x07cccf8ea8e940a4728182a4c05423c0148a805aeba3e6c43bed9743acd6d09b')?.type
      ).toBe('vanilla');

      expect(
        getStrategy('0x068da98d7798439f16b63b61644e7b27c932d5c051a455a978aa95488d5dcc9b')?.type
      ).toBe('singleSlotProof');
    });

    it('should return null for unknown authenticators', () => {
      expect(getStrategy('0x000000000000000000000000000000000000000000000000000000000000000')).toBe(
        null
      );
    });
  });
});
