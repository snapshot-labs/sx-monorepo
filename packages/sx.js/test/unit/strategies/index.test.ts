import { getStrategy } from '../../../src/strategies';
import { defaultNetwork } from '../../../src/networks';

describe('voting strategies', () => {
  describe('getStrategy', () => {
    it('should return correct strategy from predefined default addresses', () => {
      expect(
        getStrategy(
          '0x058623786b93d9b6ed1f83cec5c6fa6bea5f399d2795ee56a6123bdd83f5aa48',
          defaultNetwork
        )?.type
      ).toBe('vanilla');

      expect(
        getStrategy(
          '0x00d1b81feff3095ca9517fdfc7427e742ce96f7ca8f3b2664a21b2fba552493b',
          defaultNetwork
        )?.type
      ).toBe('singleSlotProof');
    });
  });
});
