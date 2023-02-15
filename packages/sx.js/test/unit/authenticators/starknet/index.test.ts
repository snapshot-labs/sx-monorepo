import { getAuthenticator } from '../../../../src/authenticators/starknet';
import { defaultNetwork } from '../../../../src/networks';

describe('authenticators', () => {
  describe('getAuthenticator', () => {
    it('should return correct authenticator from predefined default addresses', () => {
      expect(
        getAuthenticator(
          '0x05e1f273ca9a11f78bfb291cbe1b49294cf3c76dd48951e7ab7db6d9fb1e7d62',
          defaultNetwork
        )?.type
      ).toBe('vanilla');

      expect(
        getAuthenticator(
          '0x064cce9272197eba6353f5bbf060e097e516b411e66e83a9cf5910a08697df14',
          defaultNetwork
        )?.type
      ).toBe('ethSig');
    });
  });
});
