import { getStrategy } from '../../../src/strategies';

describe('strategies', () => {
  describe('getAuthenticator', () => {
    it('should return correct authenticator with predefined addresses', () => {
      expect(
        getStrategy('0x515fbfa25bcf1e9419cdb8886cb8878d2705cdd2be8cf434675e19314b89d71')?.type
      ).toBe('vanilla');

      expect(
        getStrategy('0x68da98d7798439f16b63b61644e7b27c932d5c051a455a978aa95488d5dcc9b')?.type
      ).toBe('singleSlotProof');
    });

    it('should return null for unknown authenticators', () => {
      expect(getStrategy('0x000000000000000000000000000000000000000000000000000000000000000')).toBe(
        null
      );
    });
  });
});
