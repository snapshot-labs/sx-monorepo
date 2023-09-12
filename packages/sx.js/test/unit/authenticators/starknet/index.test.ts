import { getAuthenticator } from '../../../../src/authenticators/starknet';
import { defaultNetwork } from '../../../../src/networks';

describe('authenticators', () => {
  describe('getAuthenticator', () => {
    it('should return correct authenticator from predefined default addresses', () => {
      expect(
        getAuthenticator(
          '0x06c363a572f7f86b58fff89abf6f924cb75e97a92af2b2acbdd0156ddd18761d',
          defaultNetwork
        )?.type
      ).toBe('vanilla');

      expect(
        getAuthenticator(
          '0x2c27791b44910c295e3fadaa4d3a9b095cefb5554f885f2362c40209978555',
          defaultNetwork
        )?.type
      ).toBe('ethTx');
    });
  });
});
