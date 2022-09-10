import { getStrategy } from '../../../src/strategies';

describe('strategies', () => {
  describe('getAuthenticator', () => {
    it('should return correct authenticator with predefined addresses', () => {
      expect(
        getStrategy('0x344a63d1f5cd0e5f707fede9886d5dd306e86eba91ea410b416f39e44c3865')?.type
      ).toBe('vanilla');

      expect(
        getStrategy('0x4bbd8081b1e9ef84ee2a767ef2cdcdea0dd8298b8e2858afa06bed1898533e6')?.type
      ).toBe('singleSlotProof');
    });

    it('should return null for unknown authenticators', () => {
      expect(getStrategy('0x000000000000000000000000000000000000000000000000000000000000000')).toBe(
        null
      );
    });
  });
});
