import { getStrategy } from '../../../../src/strategies/starknet';
import { defaultNetwork } from '../../../../src/networks';

describe('voting strategies', () => {
  describe('getStrategy', () => {
    it('should return correct strategy from predefined default addresses', () => {
      expect(
        getStrategy(
          '0x04ad4a117a2b047fc3e25bf52791bc8f29a0871ac3c41a3e176f18c8a1087815',
          defaultNetwork
        )?.type
      ).toBe('vanilla');
    });
  });
});
