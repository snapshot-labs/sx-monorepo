import { hash } from 'starknet';
import createEthSigAuthenticator from '../../../../src/authenticators/starknet/ethSig';
import { proposeEnvelope } from '../../fixtures';

describe('ethSigAuthenticator', () => {
  const ethSigAuthenticator = createEthSigAuthenticator();

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
        '0xa3804d2b217767882cacfb85bd5e8d5a',
        '0x33bbb847e30b943aadc6101e20fbd32d',
        '0x1190ac129b3f39bad5789a4397d8e362',
        '0x1a81dfa00b5ceec8945545276f56dd2a',
        '0x1b',
        '0x0',
        '0x0',
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
