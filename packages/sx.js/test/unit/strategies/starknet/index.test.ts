import { describe, expect, it } from 'vitest';
import { starknetNetworks, starknetSepolia } from '../../../../src/networks';
import { getStrategy } from '../../../../src/strategies/starknet';
import { NetworkConfig } from '../../../../src/types';
import { hexPadLeft } from '../../../../src/utils/encoding';

describe('voting strategies', () => {
  describe('getStrategy', () => {
    const { MerkleWhitelist } = starknetNetworks['sn-sep'].Strategies;

    it('should return correct strategy from predefined default addresses', () => {
      expect(getStrategy(MerkleWhitelist, starknetSepolia)?.type).toBe(
        'whitelist'
      );
    });

    it('should dispatch the Herodotus Satellite strategy versions', () => {
      const evmAddress = '0x123';
      const ozAddress = '0x456';

      const config = {
        strategies: {
          [hexPadLeft(evmAddress)]: { type: 'evmSlotValueV2' },
          [hexPadLeft(ozAddress)]: {
            type: 'ozVotesStorageProofV2',
            params: { trace: 208 }
          }
        }
      } as unknown as NetworkConfig;

      expect(getStrategy(evmAddress, config)?.type).toBe('evmSlotValueV2');
      expect(getStrategy(ozAddress, config)?.type).toBe(
        'ozVotesStorageProofV2'
      );
    });
  });
});
