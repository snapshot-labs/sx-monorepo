import { getStrategy } from '../../../src/strategies';
import vanillaStrategy from '../../../src/strategies/vanilla';
import singleSlotProofStrategy from '../../../src/strategies/singleSlotProof';

describe('voting strategies', () => {
  describe('getStrategy', () => {
    it('should return correct strategy from predefined default addresses', () => {
      expect(
        getStrategy('0x515fbfa25bcf1e9419cdb8886cb8878d2705cdd2be8cf434675e19314b89d71')?.type
      ).toBe('vanilla');

      expect(
        getStrategy('0x68da98d7798439f16b63b61644e7b27c932d5c051a455a978aa95488d5dcc9b')?.type
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
