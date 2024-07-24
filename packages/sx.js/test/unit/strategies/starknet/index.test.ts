import { describe, expect, it } from 'vitest';
import { starknetNetworks, starknetSepolia } from '../../../../src/networks';
import { getStrategy } from '../../../../src/strategies/starknet';

describe('voting strategies', () => {
  describe('getStrategy', () => {
    const { MerkleWhitelist } = starknetNetworks['sn-sep'].Strategies;

    it('should return correct strategy from predefined default addresses', () => {
      expect(getStrategy(MerkleWhitelist, starknetSepolia)?.type).toBe(
        'whitelist'
      );
    });
  });
});
