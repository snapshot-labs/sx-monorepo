import { getAuthenticator } from '../../../src/authenticators';

describe('authenticators', () => {
  describe('getAuthenticator', () => {
    it('should return correct authenticator with predefined addresses', () => {
      expect(
        getAuthenticator('0x036f53ac6efe16403267873d307db90b5cc10c97fd3353af3107609bb63f9f83')?.type
      ).toBe('vanilla');

      expect(
        getAuthenticator('0x04bbd4959806784f2ad7541e36eda88d9b3dff1baef60b39862abc171f3eed38')?.type
      ).toBe('ethSig');
    });

    it('should return null for unknown authenticators', () => {
      expect(
        getAuthenticator('0x000000000000000000000000000000000000000000000000000000000000000')
      ).toBe(null);
    });
  });
});
