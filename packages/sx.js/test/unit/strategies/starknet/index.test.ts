import { getStrategy } from '../../../../src/strategies/starknet';
import { starknetNetworks, starknetGoerli } from '../../../../src/networks';

describe('voting strategies', () => {
  describe('getStrategy', () => {
    const { MerkleWhitelist } = starknetNetworks['sn-tn'].Strategies;

    it('should return correct strategy from predefined default addresses', () => {
      expect(getStrategy(MerkleWhitelist, starknetGoerli)?.type).toBe('whitelist');
    });
  });
});
