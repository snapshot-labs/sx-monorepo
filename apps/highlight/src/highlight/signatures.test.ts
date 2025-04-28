import { describe, expect, it } from 'vitest';
import { verifyEcdsaSignature, verifyEip1271Signature } from './signatures';
import { SET_ALIAS_TYPES } from '../agents/aliases';

function createDomain(chainId: number, salt: string) {
  return {
    name: 'highlight',
    version: '0.1.0',
    chainId,
    salt,
    verifyingContract: '0x0000000000000000000000000000000000000001'
  };
}

describe('ECDSA', () => {
  it('should return true for valid signature', async () => {
    const salt =
      '0xdd5af5826f3e745ed67794977e6e30e8fecdd1c60aa13426b9bd995c604e77df';
    const message = {
      from: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      alias: '0x22c1d617008f98F883DF01b347Ca78f12A3562A7'
    };

    const signature =
      '0xb97e0ce664cf74cf1500992eb510a3541d772be062bbb2149e16e440e39cad6863682cda5742085b70b590b71f4f0574315ec850885f55a6a7d65e9d821161ad1c';

    const result = await verifyEcdsaSignature(
      createDomain(11155111, salt),
      message.from,
      SET_ALIAS_TYPES,
      message,
      signature
    );

    expect(result).toBe(true);
  });

  it('should return false for valid signature', async () => {
    const salt =
      '0xdd5af5826f3e745ed67794977e6e30e8fecdd1c60aa13426b9bd995c604e77df';
    const message = {
      from: '0x866A13CEAF33659DBE80aee6D67f0A303F97047f',
      alias: '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70'
    };

    const signature =
      '0xee4eca1bbcc10a15f862637a9db6987049be7312b13c55bc6e5b1edc7f567f7062fde75eecfbc1abcd0c2807806b5548008bf8b681bea4f8af4da39c1da1b3471c';

    const result = await verifyEcdsaSignature(
      createDomain(11155111, salt),
      message.from,
      SET_ALIAS_TYPES,
      message,
      signature
    );

    expect(result).toBe(false);
  });
});

describe('eip1271', () => {
  it('should return true for valid signature', async () => {
    const salt =
      '0x2f7825c4048760606cca7ddf1f57efbce3fdc2c8443a2e2aa8595992ab4a1494';
    const message = {
      from: '0x8edfcc5f141ffc2b6892530d1fb21bbcdc74b455',
      alias: '0xCbe6064F307251a62E457F298C18107C905e2573'
    };

    const signature =
      '0xb7f4220ee17579e1e11f81c88c9db1f0170fbb1fffec85146e3f9bc619a4524e7a540f7686965c844c9d5d7c809824b208a2e8ac36f6ff8c54a3f8426cdc98be1b';

    const result = await verifyEip1271Signature(
      createDomain(11155111, salt),
      message.from,
      SET_ALIAS_TYPES,
      message,
      signature
    );

    expect(result).toBe(true);
  });

  it('should return false for invalid signature', async () => {
    const salt =
      '0x2f7825c4048760606cca7ddf1f57efbce3fdc2c8443a2e2aa8595992ab4a1494';
    const message = {
      from: '0x8edfcc5f141ffc2b6892530d1fb21bbcdc74b455',
      alias: '0xCbe6064F307251a62E457F298C18107C905e2573'
    };

    const signature =
      '0xee4eca1bbcc10a15f862637a9db6987049be7312b13c55bc6e5b1edc7f567f7062fde75eecfbc1abcd0c2807806b5548008bf8b681bea4f8af4da39c1da1b3471c';

    const result = await verifyEip1271Signature(
      createDomain(11155111, salt),
      message.from,
      SET_ALIAS_TYPES,
      message,
      signature
    );

    expect(result).toBe(false);
  });
});
