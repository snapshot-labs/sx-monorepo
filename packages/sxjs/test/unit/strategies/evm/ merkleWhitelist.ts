import { JsonRpcProvider } from '@ethersproject/providers';
import { AbiCoder } from '@ethersproject/abi';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import createMerkleWhitelist from '../../../../src/strategies/evm/merkleWhitelist';

describe('merkleWhitelistStrategy', () => {
  const whitelistStrategy = createMerkleWhitelist();

  const provider = new JsonRpcProvider('https://rpc.brovider.xyz/5');

  const whitelist = [['0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70', 21n]] as [string, bigint][];
  const merkleWhitelistStrategyMetadata = {
    tree: whitelist.map(([address, votingPower]) => ({
      address,
      votingPower
    }))
  };

  const tree = StandardMerkleTree.of(whitelist, ['address', 'uint96']);

  const abiCoder = new AbiCoder();
  const whitelistParams = abiCoder.encode(['bytes32'], [tree.root]);

  it('should return type', () => {
    expect(whitelistStrategy.type).toBe('whitelist');
  });

  describe('getVotingPower', () => {
    it('should compute voting power for whitelisted user', async () => {
      const votingPower = await whitelistStrategy.getVotingPower(
        '0xc89a0c93af823f794f96f7b2b63fc2a1f1ae9427',
        '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
        merkleWhitelistStrategyMetadata,
        9343895,
        whitelistParams,
        provider
      );

      expect(votingPower.toString()).toEqual('21');
    });

    it('should compute voting power for non-whitelisted user', async () => {
      const votingPower = await whitelistStrategy.getVotingPower(
        '0xc89a0c93af823f794f96f7b2b63fc2a1f1ae9427',
        '0x000000000000000000000000000000000000dead',
        merkleWhitelistStrategyMetadata,
        9343895,
        whitelistParams,
        provider
      );

      expect(votingPower.toString()).toEqual('0');
    });
  });
});
