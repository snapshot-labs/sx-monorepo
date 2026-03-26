import { describe, expect, it, vi } from 'vitest';
import { getValidator } from './validation';

vi.mock('@/helpers/resolver', () => ({
  resolver: {
    resolveEns: vi.fn(async (_networkId: string, name: string) => {
      if (name === 'test.eth') return { address: '0x1234', networkId: 'eth' };

      return null;
    })
  }
}));

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

describe('decimals', () => {
  it('should verify that number has no decimals if 0 decimals is specified', () => {
    const schema = {
      type: 'object',
      required: ['value'],
      properties: {
        value: {
          type: 'string',
          decimals: 0
        }
      }
    };

    const validator = getValidator(schema);

    expect(validator.validate({ value: '10' })).toEqual({});
    expect(validator.validate({ value: '10.1' })).toEqual({
      value: 'Can have at most 0 decimals.'
    });
    expect(validator.validate({ value: '10.00000000000001' })).toEqual({
      value: 'Can have at most 0 decimals.'
    });
  });

  it('should verify that number has at most 8 decimals', () => {
    const schema = {
      type: 'object',
      required: ['value'],
      properties: {
        value: {
          type: 'string',
          decimals: 8
        }
      }
    };

    const validator = getValidator(schema);

    expect(validator.validate({ value: '10' })).toEqual({});
    expect(validator.validate({ value: '10.0' })).toEqual({});
    expect(validator.validate({ value: '10.1' })).toEqual({});
    expect(validator.validate({ value: '10.00000001' })).toEqual({});
    expect(validator.validate({ value: '10.000000001' })).toEqual({
      value: 'Can have at most 8 decimals.'
    });
  });
});

describe('ens-or-address', () => {
  const schema = {
    $async: true,
    type: 'object',
    properties: {
      to: {
        type: 'string',
        format: 'ens-or-address'
      }
    }
  };
  const validator = getValidator(schema);

  it('should accept a valid ENS name', async () => {
    const result = await validator.validateAsync({ to: 'test.eth' });
    expect(result).toEqual({});
  });

  it('should accept a valid address', async () => {
    const result = await validator.validateAsync({
      to: '0x395ed61716b48dc904140b515e9f682e33330154'
    });
    expect(result).toEqual({});
  });

  it('should reject an invalid value', async () => {
    const result = await validator.validateAsync({ to: 'not-valid' });
    expect(result).toHaveProperty('to');
  });
});
