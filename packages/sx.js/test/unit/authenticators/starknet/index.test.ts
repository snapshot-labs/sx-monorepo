import { getAuthenticator } from '../../../../src/authenticators/starknet';
import { defaultNetwork } from '../../../../src/networks';

describe('authenticators', () => {
  describe('getAuthenticator', () => {
    it('should return correct authenticator from predefined default addresses', () => {
      expect(
        getAuthenticator(
          '0x046ad946f22ac4e14e271f24309f14ac36f0fde92c6831a605813fefa46e0893',
          defaultNetwork
        )?.type
      ).toBe('vanilla');

      expect(
        getAuthenticator(
          '0x00d6f14d3df9ea2db12ed9572ab41d527f18dd24192e1744d3c100b2cd470812',
          defaultNetwork
        )?.type
      ).toBe('ethTx');
    });
  });
});
