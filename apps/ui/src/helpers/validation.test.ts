import { describe, expect, it } from 'vitest';
import { getValidator } from './validation';

describe('validation', () => {
  describe('addresses-with-voting-power', () => {
    const schema = {
      type: 'object',
      properties: {
        whitelist: {
          type: 'string',
          format: 'addresses-with-voting-power'
        }
      }
    };
    const validator = getValidator(schema);

    it('should not return errors for a single valid EVM address with voting power', () => {
      const result = validator.validate({
        whitelist: '0x395ed61716b48dc904140b515e9f682e33330154:1'
      });

      expect(result).toEqual({});
    });

    it('should not return errors for a single valid starknet address with voting power', () => {
      const result = validator.validate({
        whitelist:
          '0x7d2f37b75a5e779f7da01c22acee1b66c39e8ba470ee5448f05e1462afcedb4:1'
      });

      expect(result).toEqual({});
    });

    it('should not return errors for a list of addresses with voting power', () => {
      const result = validator.validate({
        whitelist: `
          0x7d2f37b75a5e779f7da01c22acee1b66c39e8ba470ee5448f05e1462afcedb4 :  1

0x7d2f37b75a5e779f7da01c22acee1b66c39e8ba470ee5448f05e1462afcedb4:2
          0x7d2f37b75a5e779f7da01c22acee1b66c39e8ba470ee5448f05e1462afcedb4:3,0x7d2f37b75a5e779f7da01c22acee1b66c39e8ba470ee5448f05e1462afcedb4:4


        `
      });

      expect(result).toEqual({});
    });

    it('should return an error when voting power is missing', () => {
      const result = validator.validate({
        whitelist: '0x395ed61716b48dc904140b515e9f682e33330154'
      });

      expect(result).toHaveProperty('whitelist');
    });

    it('should return an error when voting power is empty', () => {
      const result = validator.validate({
        whitelist: '0x395ed61716b48dc904140b515e9f682e33330154:'
      });

      expect(result).toHaveProperty('whitelist');
    });

    it('should return an error when voting power is invalid', () => {
      const result = validator.validate({
        whitelist: '0x395ed61716b48dc904140b515e9f682e33330154:4xx!'
      });

      expect(result).toHaveProperty('whitelist');
    });

    it('should return an error when address is not valid', () => {
      const result = validator.validate({
        whitelist: '-0x395ed61716b48dc904140b515e9f682e33330154:0'
      });

      expect(result).toHaveProperty('whitelist');
    });

    it('should return an error when address is empty', () => {
      const result = validator.validate({
        whitelist: ':0'
      });

      expect(result).toHaveProperty('whitelist');
    });

    it('should return an error when not following the address:vp format', () => {
      const result = validator.validate({
        whitelist: 'hello world'
      });

      expect(result).toHaveProperty('whitelist');
    });
  });
});
