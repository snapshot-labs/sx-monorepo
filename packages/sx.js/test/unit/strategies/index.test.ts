import { getStrategy } from '../../../src/strategies';
import vanillaStrategy from '../../../src/strategies/vanilla';
import singleSlotProofStrategy from '../../../src/strategies/singleSlotProof';

describe('voting strategies', () => {
  describe('getStrategy', () => {
    it('should return correct strategy from predefined default addresses', () => {
      expect(
        getStrategy('0x058623786b93d9b6ed1f83cec5c6fa6bea5f399d2795ee56a6123bdd83f5aa48')?.type
      ).toBe('vanilla');

      expect(
        getStrategy('0x00d1b81feff3095ca9517fdfc7427e742ce96f7ca8f3b2664a21b2fba552493b')?.type
      ).toBe('singleSlotProof');
    });

    it('should return correct strategy from supplied addresses', () => {
      const strategies = {
        '0x91469387a06fb88dd66559f4bc91e4c0c1e61e65c259b14a4d43f274fdabd922': vanillaStrategy,
        '0x0091469387a06fb88dd66559f4bc91e4c0c1e61e65c259b14a4d43f274fdabd9':
          singleSlotProofStrategy
      };
      expect(
        getStrategy(
          '0x91469387a06fb88dd66559f4bc91e4c0c1e61e65c259b14a4d43f274fdabd922',
          strategies
        )?.type
      ).toBe('vanilla');

      expect(
        getStrategy(
          '0x0091469387a06fb88dd66559f4bc91e4c0c1e61e65c259b14a4d43f274fdabd9',
          strategies
        )?.type
      ).toBe('singleSlotProof');
    });

    it('should return null for unknown strategies', () => {
      expect(getStrategy('0x000000000000000000000000000000000000000000000000000000000000000')).toBe(
        null
      );
    });
  });
});
