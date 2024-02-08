import { getAuthenticator } from '../../../../src/authenticators/starknet';
import { starknetNetworks, starknetGoerli } from '../../../../src/networks';

describe('authenticators', () => {
  describe('getAuthenticator', () => {
    const { Vanilla, EthTx } = starknetNetworks['sn-tn'].Authenticators;

    it('should return correct authenticator from predefined default addresses', () => {
      expect(getAuthenticator(Vanilla, starknetGoerli)?.type).toBe('vanilla');
      expect(getAuthenticator(EthTx, starknetGoerli)?.type).toBe('ethTx');
    });
  });
});
