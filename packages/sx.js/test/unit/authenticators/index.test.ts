import { getAuthenticator } from '../../../src/authenticators';
import vanillaAuthenticator from '../../../src/authenticators/vanilla';
import ethSigAuthenticator from '../../../src/authenticators/ethSig';

describe('authenticators', () => {
  describe('getAuthenticator', () => {
    it('should return correct authenticator from predefined default addresses', () => {
      expect(
        getAuthenticator('0x05e1f273ca9a11f78bfb291cbe1b49294cf3c76dd48951e7ab7db6d9fb1e7d62')?.type
      ).toBe('vanilla');

      expect(
        getAuthenticator('0x064cce9272197eba6353f5bbf060e097e516b411e66e83a9cf5910a08697df14')?.type
      ).toBe('ethSig');
    });

    it('should return correct authenticator from supplied addresses', () => {
      const authenticators = {
        '0x91469387a06fb88dd66559f4bc91e4c0c1e61e65c259b14a4d43f274fdabd922': vanillaAuthenticator,
        '0x0091469387a06fb88dd66559f4bc91e4c0c1e61e65c259b14a4d43f274fdabd9': ethSigAuthenticator
      };
      expect(
        getAuthenticator(
          '0x91469387a06fb88dd66559f4bc91e4c0c1e61e65c259b14a4d43f274fdabd922',
          authenticators
        )?.type
      ).toBe('vanilla');

      expect(
        getAuthenticator(
          '0x0091469387a06fb88dd66559f4bc91e4c0c1e61e65c259b14a4d43f274fdabd9',
          authenticators
        )?.type
      ).toBe('ethSig');
    });

    it('should return null for unknown authenticators', () => {
      expect(
        getAuthenticator('0x000000000000000000000000000000000000000000000000000000000000000')
      ).toBe(null);
    });
  });
});
