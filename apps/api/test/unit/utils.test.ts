import { describe, expect, it } from 'vitest';
import { formatAddressVariant } from '../../src/utils';

describe('formatAddressVariant', () => {
  it.each([
    [
      // checksummed Starknet address
      '0x06AbD599AB530c5b3bc603111Bdd20d77890Db330402dC870Fc9866f50eD6d2A',
      '0x06abd599ab530c5b3bc603111bdd20d77890db330402dc870fc9866f50ed6d2a'
    ],
    [
      // non-checksummed Starknet address
      '0x07c39c8912b61368aeb3111ad480fc661162798a7fe10be6fb880e2c18ccbc6f',
      '0x07c39c8912b61368aeb3111ad480fc661162798a7fe10be6fb880e2c18ccbc6f'
    ]
  ])('should format Starknet addresses (%s -> %s)', (input, output) => {
    expect(
      formatAddressVariant({
        key: 'Starknet',
        value: input
      })
    ).toEqual({
      type: 0,
      address: output
    });
  });

  it.each([
    [
      // checksummed Ethereum address
      '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70'
    ],
    [
      // non-checksummed Ethereum address
      '0x537f1896541d28f4c70116eea602b1b34da95163',
      '0x537f1896541d28F4c70116EEa602b1B34Da95163'
    ],
    [
      // unpadded Ethereum address
      '0x4c5dda09742520fdf5c2bbfa4aede8fb9fe6781',
      '0x04c5dDa09742520FDF5C2bbFA4aEdE8FB9FE6781'
    ]
  ])('should format Ethereum addresses (%s -> %s)', (input, output) => {
    expect(
      formatAddressVariant({
        key: 'Ethereum',
        value: input
      })
    ).toEqual({
      type: 1,
      address: output
    });
  });
});
