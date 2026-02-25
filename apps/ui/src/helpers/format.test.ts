import { describe, expect, it } from 'vitest';
import { removeTrailingZeroes } from './format';

describe('removeTrailingZeroes', () => {
  it.for([
    { value: 123.45, maxDecimals: 6, expected: '123.45' },
    { value: 123.0, maxDecimals: 6, expected: '123' },
    { value: 123.456789, maxDecimals: 4, expected: '123.4568' },
    { value: 123.4, maxDecimals: 2, expected: '123.4' },
    { value: 123.0001, maxDecimals: 6, expected: '123.0001' },
    { value: 123.9999999, maxDecimals: 6, expected: '124' },
    { value: 0.0000001, maxDecimals: 6, expected: '0' },
    { value: 0.1234567, maxDecimals: 6, expected: '0.123457' }
  ])(
    'removes trailing zeroes from $value with maxDecimals $maxDecimals',
    ({ value, maxDecimals, expected }) => {
      const result = removeTrailingZeroes(value, maxDecimals);
      expect(result).toBe(expected);
    }
  );
});
