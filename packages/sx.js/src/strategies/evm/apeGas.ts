import { defaultAbiCoder } from '@ethersproject/abi';
import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import ApeGasVotingStrategy from './abis/ApeGasVotingStrategy.json';
import SpaceAbi from '../../clients/evm/ethereum-tx/abis/Space.json';
import {
  ClientConfig,
  Propose,
  Strategy,
  StrategyConfig,
  Vote
} from '../../clients/evm/types';
import { VotingPowerDetailsError } from '../../utils/errors';

const API_URL = 'https://apevote.api.herodotus.cloud';

async function getUserParams({
  viewId,
  blockNumber,
  voterAddress
}: {
  viewId: string;
  blockNumber: number;
  voterAddress: string;
}) {
  const res = await fetch(
    `${API_URL}/votes/params/${viewId}/${blockNumber}/${voterAddress}`
  );

  const data = await res.json();
  if (data.error) {
    throw new VotingPowerDetailsError(
      'Block is not cached',
      'apeGas',
      'NOT_READY_YET'
    );
  }

  return defaultAbiCoder.encode(
    [
      'tuple(bytes, address, bool, uint256, tuple(uint256, uint256, uint256)[])'
    ],
    [
      [
        `0x${data.account_proof}`,
        data.address,
        data.has_delegated,
        data.voting_power,
        data.trie_proof
      ]
    ]
  );
}

export default function createApeGasStrategy(): Strategy {
  return {
    type: 'apeGas',
    async getParams(
      call: 'propose' | 'vote',
      strategyConfig: StrategyConfig,
      signerAddress: string,
      metadata: Record<string, any> | null,
      data: Propose | Vote,
      clientConfig: ClientConfig
    ): Promise<string> {
      if (call === 'propose') {
        throw new Error('Not supported for proposing');
      }

      if (!metadata) {
        throw new Error('Invalid metadata.');
      }

      const { space, proposal } = data as Vote;
      const spaceContract = new Contract(
        space,
        SpaceAbi,
        clientConfig.provider
      );

      const { startBlockNumber } = await spaceContract.proposals(proposal);

      return getUserParams({
        viewId: metadata.delegationId,
        blockNumber: startBlockNumber,
        voterAddress: signerAddress
      });
    },
    async getVotingPower(
      strategyAddress: string,
      voterAddress: string,
      metadata: Record<string, any> | null,
      block: number | null,
      params: string,
      provider: Provider
    ): Promise<bigint> {
      if (block === null) {
        // TODO: Handle delegations

        const balance = await provider.getBalance(voterAddress);
        return balance.toBigInt();
      }

      if (!metadata) {
        throw new Error('Invalid metadata.');
      }

      const userParams = await getUserParams({
        viewId: metadata.delegationId,
        blockNumber: block,
        voterAddress
      });

      const apeGasVotingStrategyContract = new Contract(
        strategyAddress,
        ApeGasVotingStrategy,
        provider
      );

      try {
        const votingPower = await apeGasVotingStrategyContract.getVotingPower(
          block,
          voterAddress,
          params,
          userParams
        );

        return BigInt(votingPower.toString());
      } catch {
        return BigInt(0);
      }
    }
  };
}
