import { describe, expect, it } from 'vitest';
import { predictCloneAddress } from '../../../src/utils/address';

describe('predictCloneAddress', () => {
  it('should return the correct address', () => {
    const implementation = '0x2e234DAe75C793f67A35089C9d99245E1C58470b';
    const salt =
      '0x0000000000000000000000000000000000000000000000000000000000000000';
    const deployer = '0xF62849F9A0B5Bf2913b396098F7c7019b51A820a';

    const out = predictCloneAddress(implementation, deployer, salt);
    expect(out).toBe('0xD6bA4Ed6B3DAaa6516535ee1FA6eaAFCf762a230');
  });
});
