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
