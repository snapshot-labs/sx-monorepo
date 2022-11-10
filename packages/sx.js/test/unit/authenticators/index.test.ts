import { getAuthenticator } from '../../../src/authenticators';
import vanillaAuthenticator from '../../../src/authenticators/vanilla';
import ethSigAuthenticator from '../../../src/authenticators/ethSig';

describe('authenticators', () => {
  describe('getAuthenticator', () => {
    it('should return correct authenticator from predefined default addresses', () => {
      expect(
        getAuthenticator('0xb32364e042cb948be62a09355595a4b80dfff4eb11a485c1950ace70b0e835')?.type
      ).toBe('vanilla');

      expect(
        getAuthenticator('0x6aac1e90da5df37bd59ac52b638a22de15231cbb78353b121df987873d0f369')?.type
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
