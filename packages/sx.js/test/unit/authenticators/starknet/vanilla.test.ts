import { hash } from 'starknet';
import createVanillaAuthenticator from '../../../../src/authenticators/starknet/vanilla';
import { proposeEnvelope } from '../../fixtures';

describe('vanillaAuthenticator', () => {
  const vanillaAuthenticator = createVanillaAuthenticator();

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
        '0x07e6e9047eb910f84f7e3b86cea7b1d7779c109c970a39b54379c1f4fa395b28',
        '0x1bfd596ae442867ef71ca523061610682af8b00fc2738329422f4ad8d220b81',
        1,
        '0x15'
      ],
      contractAddress: '0x064cce9272197eba6353f5bbf060e097e516b411e66e83a9cf5910a08697df14',
      entrypoint: 'authenticate'
    });
  });
});
