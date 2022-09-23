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
        '0x4b7cff71219e275676e0ca23579f41b99dd1d1bd01adc7d7f1bc917d448e57d',
        '0x1bfd596ae442867ef71ca523061610682af8b00fc2738329422f4ad8d220b81',
        1,
        '0x15'
      ],
      contractAddress: '0x6aac1e90da5df37bd59ac52b638a22de15231cbb78353b121df987873d0f369',
      entrypoint: 'authenticate'
    });
  });
});
