import createMerkleWhitelistStrategy from '../../../../src/strategies/starknet/merkleWhitelist';
import { AddressType, Leaf } from '../../../../src/utils/merkletree';
import { defaultNetwork } from '../../../../src/networks';
import { starkProvider } from '../../helpers';
import { proposeEnvelope } from '../../fixtures';

const ethUrl = process.env.GOERLI_NODE_URL as string;

describe('merkleWhitelist', () => {
  const leaf = new Leaf(AddressType.ETHEREUM, '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70', 42n);

  const metadata = {
    tree: [
      {
        type: leaf.type,
        address: leaf.address,
        votingPower: leaf.votingPower
      }
    ]
  };

  const merkleWhitelist = createMerkleWhitelistStrategy();
  const config = { starkProvider, ethUrl, networkConfig: defaultNetwork };

  it('should return type', () => {
    expect(merkleWhitelist.type).toBe('whitelist');
  });

  it('should return params', async () => {
    const params = await merkleWhitelist.getParams(
      'vote',
      '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      '0x344a63d1f5cd0e5f707fede9886d5dd306e86eba91ea410b416f39e44c3865',
      0,
      metadata,
      proposeEnvelope,
      config
    );

    expect(params).toEqual([1, '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70', '0x2a', '0x0', 0]);
  });

  describe('getVotingPower', () => {
    const timestamp = 1669849240;

    it('should compute voting power for user', async () => {
      const votingPower = await merkleWhitelist.getVotingPower(
        '0x0',
        '0x058623786b93d9b6ed1f83cec5c6fa6bea5f399d2795ee56a6123bdd83f5aa48',
        '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
        metadata,
        timestamp,
        ['0x00'],
        config
      );

      expect(votingPower.toString()).toEqual('42');
    });
  });
});
