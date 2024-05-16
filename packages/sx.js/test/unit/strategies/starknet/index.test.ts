import { describe, it, expect } from 'vitest';
import { getStrategy } from '../../../../src/strategies/starknet';
import { starknetNetworks, starknetSepolia } from '../../../../src/networks';

describe('voting strategies', () => {
  describe('getStrategy', () => {
    const { MerkleWhitelist } = starknetNetworks['sn-sep'].Strategies;

    it('should return correct strategy from predefined default addresses', () => {
      expect(getStrategy(MerkleWhitelist, starknetSepolia)?.type).toBe('whitelist');
    });
  });
});
