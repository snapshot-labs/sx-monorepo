import { CallData, uint256 } from 'starknet';
import { describe, expect, it } from 'vitest';
import { starknetSepolia } from '../../../../src/networks';
import createOzVotesStorageProofStrategy from '../../../../src/strategies/starknet/ozVotesStorageProof';
import { proposeEnvelope } from '../../fixtures';
import { starkProvider } from '../../helpers';

const ethUrl = process.env.SEPOLIA_NODE_URL as string;

describe('ozVotesStorageProof', () => {
  const ozVotesStorageProofStrategy = createOzVotesStorageProofStrategy({
    trace: 224
  });
  const config = { starkProvider, ethUrl, networkConfig: starknetSepolia };

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
    it('should compute live voting power', async () => {
      const votingPower = await ozVotesStorageProofStrategy.getVotingPower(
        '0x16aa0c2eda8ff56fa9922a4858d4d91e3b01cf21d2aecd01e1c95d296362218',
        '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
        {
          contractAddress: '0x6Fd821e79cDf212aD8b06C59B28FE8C2185291d4',
          slotIndex: 8
        },
        null,
        CallData.compile({
          contractAddress: '0x6Fd821e79cDf212aD8b06C59B28FE8C2185291d4',
          slotIndex: uint256.bnToUint256(8)
        }),
        config
      );

      expect(votingPower.toString()).toEqual('8000000000000000000');
    });
  });
});
