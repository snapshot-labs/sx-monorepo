import { describe, expect, it } from 'vitest';
import { resolver } from './resolver';

describe('resolver', () => {
  describe('ENS resolution', () => {
    it('should resolve an ENS name on eth network', async () => {
      const result = await resolver.resolveName('boorger.eth', 'eth');

      expect(result).toEqual({
        networkId: 'eth',
        address: '0x121026eb01aee5a1cbf2bf632941a99634e9a3dc'
      });
    });

    it('should resolve an ENS name on sepolia network', async () => {
      const result = await resolver.resolveName('boorger.eth', 'sep');

      expect(result).toEqual({
        networkId: 'sep',
        address: '0x220bc93d88c0af11f1159ea89a885d5add3a7cf6'
      });
    });

    it('should return null for unregistered ENS names', async () => {
      const result = await resolver.resolveName(
        'this-name-does-not-exist-at-all.eth',
        'eth'
      );

      expect(result).toBeNull();
    });

    it('should pass through ENS name on unsupported networks', async () => {
      const result = await resolver.resolveName('boorger.eth', 'matic');

      expect(result).toEqual({
        networkId: 'matic',
        address: 'boorger.eth'
      });
    });
  });

  describe('plain addresses', () => {
    it('should return address as-is', async () => {
      const address = '0x000000000000000000000000000000000000dead';
      const result = await resolver.resolveName(address, 'eth');

      expect(result).toEqual({
        networkId: 'eth',
        address
      });
    });
  });
});
