import { hash } from 'starknet';
import vanillaAuthenticator from '../../../src/authenticators/vanilla';
import { envelope } from '../fixtures';

describe('vanillaAuthenticator', () => {
  it('should return type', () => {
    expect(vanillaAuthenticator.type).toBe('vanilla');
  });

  it('should create call', () => {
    const call = vanillaAuthenticator.createCall(envelope, hash.getSelectorFromName('propose'), [
      '0x15'
    ]);

    expect(call).toEqual({
      calldata: [
        '0x069555971fbf76b3d0471297818ed93986fdd7afe3816d53ea8d8e72034260d8',
        '0x1bfd596ae442867ef71ca523061610682af8b00fc2738329422f4ad8d220b81',
        1,
        '0x15'
      ],
      contractAddress: '0x594a81b66c3aa2c64577916f727e1307b60c9d6afa80b6f5ca3e3049c40f643',
      entrypoint: 'authenticate'
    });
  });
});
