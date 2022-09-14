import { hash } from 'starknet';
import ethSigAuthenticator from '../../../src/authenticators/ethSig';
import { proposeEnvelope } from '../fixtures';

describe('ethSigAuthenticator', () => {
  it('should return type', () => {
    expect(ethSigAuthenticator.type).toBe('ethSig');
  });

  it('should create call', () => {
    const call = ethSigAuthenticator.createCall(
      proposeEnvelope,
      hash.getSelectorFromName('propose'),
      ['0x15']
    );

    expect(call).toEqual({
      calldata: [
        '0x74c87146c9ec0e37400019d3b5e73300',
        '0x9477b6bae1534ea017fc44d8df019dcd',
        '0x6a24d54eb1b496f88f04c467a9574f21',
        '0x10f89f8c80474f42f7d9a125156e8dc2',
        '0x1c',
        '0xa7e8ddee',
        '0x0',
        '0x0375bc9b4d236f961cbc5410213cdbf2de6dfe30f21b2c58bb4de3713d868383',
        '0x1bfd596ae442867ef71ca523061610682af8b00fc2738329422f4ad8d220b81',
        1,
        '0x15'
      ],
      contractAddress: '0x4bbd4959806784f2ad7541e36eda88d9b3dff1baef60b39862abc171f3eed38',
      entrypoint: 'authenticate'
    });
  });
});
