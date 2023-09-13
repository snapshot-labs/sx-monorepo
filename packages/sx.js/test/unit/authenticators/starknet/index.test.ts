import { getAuthenticator } from '../../../../src/authenticators/starknet';
import { defaultNetwork } from '../../../../src/networks';

describe('authenticators', () => {
  describe('getAuthenticator', () => {
    it('should return correct authenticator from predefined default addresses', () => {
      expect(
        getAuthenticator(
          '0x7ea118e919c2d693f6c6d4643caae86814e8a7c06a77c33799e8d5f8a544a2',
          defaultNetwork
        )?.type
      ).toBe('vanilla');

      expect(
        getAuthenticator(
          '0x204546a6d59f757677506cb6e6b031dd0f4990613ce6e9212a2e76c67a7dc54',
          defaultNetwork
        )?.type
      ).toBe('ethTx');
    });
  });
});
