import { getStrategy } from '../../../../src/strategies/starknet';
import { defaultNetwork } from '../../../../src/networks';

describe('voting strategies', () => {
  describe('getStrategy', () => {
    it('should return correct strategy from predefined default addresses', () => {
      expect(
        getStrategy(
          '0x510d1e6d386a2adcfc6f2a57f80c4c4268baeccbd4a09334e843b17ce9225ee',
          defaultNetwork
        )?.type
      ).toBe('vanilla');
    });
  });
});
