import { getAuthenticator } from '../../../src/authenticators';

describe('authenticators', () => {
  describe('getAuthenticator', () => {
    it('should return correct authenticator with predefined addresses', () => {
      expect(
        getAuthenticator('0x6ad07205a4d725c5c2b10c4f5fbdfaaa351c742fce7a5a22b2b56fd8d5afd62')?.type
      ).toBe('vanilla');

      expect(
        getAuthenticator('0x594a81b66c3aa2c64577916f727e1307b60c9d6afa80b6f5ca3e3049c40f643')?.type
      ).toBe('ethSig');
    });

    it('should return null for unknown authenticators', () => {
      expect(
        getAuthenticator('0x000000000000000000000000000000000000000000000000000000000000000')
      ).toBe(null);
    });
  });
});
