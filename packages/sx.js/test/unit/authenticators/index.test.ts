import { getAuthenticator } from '../../../src/authenticators';

describe('authenticators', () => {
  describe('getAuthenticator', () => {
    it('should return correct authenticator with predefined addresses', () => {
      expect(
        getAuthenticator('0xb32364e042cb948be62a09355595a4b80dfff4eb11a485c1950ace70b0e835')?.type
      ).toBe('vanilla');

      expect(
        getAuthenticator('0x6aac1e90da5df37bd59ac52b638a22de15231cbb78353b121df987873d0f369')?.type
      ).toBe('ethSig');
    });

    it('should return null for unknown authenticators', () => {
      expect(
        getAuthenticator('0x000000000000000000000000000000000000000000000000000000000000000')
      ).toBe(null);
    });
  });
});
