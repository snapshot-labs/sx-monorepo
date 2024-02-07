import createOzVotesStorageProofStrategy from '../../../../src/strategies/starknet/ozVotesStorageProof';
import { defaultNetwork } from '../../../../src/networks';
import { starkProvider } from '../../helpers';
import { proposeEnvelope } from '../../fixtures';
import { CallData, uint256 } from 'starknet';

const ethUrl = process.env.GOERLI_NODE_URL as string;

describe('ozVotesStorageProof', () => {
  const ozVotesStorageProofStrategy = createOzVotesStorageProofStrategy({
    deployedOnChain: 'SN_GOERLI'
  });
  const config = { starkProvider, ethUrl, networkConfig: defaultNetwork };

  it('should return type', () => {
    expect(ozVotesStorageProofStrategy.type).toBe('ozVotesStorageProof');
  });

  it('should throw for non-ethereum address', async () => {
    expect(
      ozVotesStorageProofStrategy.getParams(
        'vote',
        '0x06AbD599AB530c5b3bc603111Bdd20d77890Db330402dC870Fc9866f50eD6d2A',
        '0x1b3cbb267de6d0f30ddf521cd385a2e11836f0c5ba6f7b2224cf77a6ed86acf',
        0,
        null,
        proposeEnvelope,
        config
      )
    ).rejects.toThrow('Not supported for non-Ethereum addresses');
  });

  describe('getVotingPower', () => {
    const timestamp = 1706623413;

    it('should compute voting power for user', async () => {
      const votingPower = await ozVotesStorageProofStrategy.getVotingPower(
        '0x1b3cbb267de6d0f30ddf521cd385a2e11836f0c5ba6f7b2224cf77a6ed86acf',
        '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
        {
          contractAddress: '0xd96844c9B21CB6cCf2c236257c7fc703E43BA071',
          slotIndex: 8
        },
        timestamp,
        CallData.compile({
          contractAddress: '0xd96844c9B21CB6cCf2c236257c7fc703E43BA071',
          slotIndex: uint256.bnToUint256(8)
        }),
        config
      );

      expect(votingPower.toString()).toEqual('200000000000000000000');
    });
  });
});
