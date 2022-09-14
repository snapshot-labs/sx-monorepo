import { hash } from 'starknet';
import vanillaAuthenticator from '../../../src/authenticators/vanilla';
import { proposeEnvelope } from '../fixtures';

describe('vanillaAuthenticator', () => {
  it('should return type', () => {
    expect(vanillaAuthenticator.type).toBe('vanilla');
  });

  it('should create call', () => {
    const call = vanillaAuthenticator.createCall(
      proposeEnvelope,
      hash.getSelectorFromName('propose'),
      ['0x15']
    );

    expect(call).toEqual({
      calldata: [
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
