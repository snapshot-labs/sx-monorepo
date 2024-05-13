import { describe, it, expect } from 'vitest';
import { getAuthenticator } from '../../../../src/authenticators/starknet';
import { starknetNetworks, starknetSepolia } from '../../../../src/networks';

describe('authenticators', () => {
  describe('getAuthenticator', () => {
    const { Vanilla, EthTx } = starknetNetworks['sn-sep'].Authenticators;

    it('should return correct authenticator from predefined default addresses', () => {
      expect(getAuthenticator(Vanilla, starknetSepolia)?.type).toBe('vanilla');
      expect(getAuthenticator(EthTx, starknetSepolia)?.type).toBe('ethTx');
    });
  });
});
