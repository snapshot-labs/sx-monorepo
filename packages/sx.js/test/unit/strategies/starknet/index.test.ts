import { getStrategy } from '../../../../src/strategies/starknet';
import { defaultNetwork } from '../../../../src/networks';

describe('voting strategies', () => {
  describe('getStrategy', () => {
    it('should return correct strategy from predefined default addresses', () => {
      expect(
        getStrategy(
          '0x00e3ca14dcb7862116bbbe4331a9927c6693b141aa8936bb76e2bdfa4b551a52',
          defaultNetwork
        )?.type
      ).toBe('whitelist');
    });
  });
});
