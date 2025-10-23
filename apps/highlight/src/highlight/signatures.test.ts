import { ALIASES_CONFIG, STARKNET_ALIASES_CONFIG } from '@snapshot-labs/sx';
import { describe, expect, it } from 'vitest';
import {
  verifyEcdsaSignature,
  verifyEip1271Signature,
  verifyStarknetSignature
} from './signatures';

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
      ALIASES_CONFIG.types.setAlias,
      message,
      signature,
      'SetAlias'
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
      ALIASES_CONFIG.types.setAlias,
      message,
      signature,
      'SetAlias'
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
      ALIASES_CONFIG.types.setAlias,
      message,
      signature,
      'SetAlias'
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
      ALIASES_CONFIG.types.setAlias,
      message,
      signature,
      'SetAlias'
    );

    expect(result).toBe(false);
  });
});

describe('Starknet', () => {
  function createStarknetDomain(chainId: string) {
    return {
      name: 'highlight',
      version: '0.1.0',
      chainId: chainId,
      revision: '1'
    };
  }

  it('should return true for valid signature', async () => {
    const message = {
      from: '0x03c56e9437c23bbfce260b1e6ae45eee4cf808cfef4b5e767d1a2a5e152a71df',
      alias: '0x6343839849E5396917d83Ac99F893E932D7359Da'
    };

    const signature =
      '0x2,0x0,0xec31c589d1f36a04d2855cc464ce048bb925430653f146c3d5edc31282405d,0x3eec5cfade99ac1a53ce6da51f9d1898e73bd4e95dc96f10235356288eb1fc8,0x7cd0a64f646aa3e425605fabf14e59cb877654069a475751ed183e670afcbe9,0x0,0x424fd8e0158c9d744ca6c22e7c48a1b46914a98e0e2fc6e78e69a7d5a7b84b4,0x1b9669c4b965e2c4fa1d7b886b98aa14ec79bcd41505a3d7ec1c6f91a45587f,0x7998d0b6f4ecfaea77667a0abd40176fde7b9b81f61fdbd55985184a607da04';

    const result = await verifyStarknetSignature(
      createStarknetDomain('0x534e5f4d41494e'),
      message.from,
      STARKNET_ALIASES_CONFIG.types.setAlias,
      message,
      signature,
      'SetAlias'
    );

    expect(result).toBe(true);
  });

  it('should return false for invalid signature', async () => {
    const message = {
      from: '0x03c56e9437c23bbfce260b1e6ae45eee4cf808cfef4b5e767d1a2a5e152a71df',
      alias: '0x6343839849E5396917d83Ac99F893E932D7359Da'
    };

    // Invalid signature format (not comma-separated)
    const signature = '0xinvalidsignature';

    const result = await verifyStarknetSignature(
      createStarknetDomain('0x534e5f4d41494e'),
      message.from,
      STARKNET_ALIASES_CONFIG.types.setAlias,
      message,
      signature,
      'SetAlias'
    );

    expect(result).toBe(false);
  });

  it('should return false for unsupported chainId', async () => {
    const message = {
      from: '0x03c56e9437c23bbfce260b1e6ae45eee4cf808cfef4b5e767d1a2a5e152a71df',
      alias: '0x6343839849E5396917d83Ac99F893E932D7359Da'
    };

    const signature =
      '0x2,0x0,0xec31c589d1f36a04d2855cc464ce048bb925430653f146c3d5edc31282405d,0x3eec5cfade99ac1a53ce6da51f9d1898e73bd4e95dc96f10235356288eb1fc8,0x7cd0a64f646aa3e425605fabf14e59cb877654069a475751ed183e670afcbe9,0x0,0x424fd8e0158c9d744ca6c22e7c48a1b46914a98e0e2fc6e78e69a7d5a7b84b4,0x1b9669c4b965e2c4fa1d7b886b98aa14ec79bcd41505a3d7ec1c6f91a45587f,0x7998d0b6f4ecfaea77667a0abd40176fde7b9b81f61fdbd55985184a607da04';

    const result = await verifyStarknetSignature(
      createStarknetDomain('test'), // Unsupported chainId
      message.from,
      STARKNET_ALIASES_CONFIG.types.setAlias,
      message,
      signature,
      'SetAlias'
    );

    expect(result).toBe(false);
  });
});
