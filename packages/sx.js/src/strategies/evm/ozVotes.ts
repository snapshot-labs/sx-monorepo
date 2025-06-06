import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import IVotes from './abis/IVotes.json';
import { Strategy } from '../../clients/evm/types';

export default function createOzVotesStrategy(): Strategy {
  return {
    type: 'ozVotes',
    async getParams(): Promise<string> {
      return '0x00';
    },
    async getVotingPower(
      strategyAddress: string,
      voterAddress: string,
      metadata: Record<string, any> | null,
      block: number | null,
      params: string,
      provider: Provider
    ): Promise<bigint> {
      const votesContract = new Contract(params, IVotes, provider);

      const votingPower = await votesContract.getVotes(voterAddress, {
        blockTag: block ?? 'latest'
      });

      return BigInt(votingPower.toString());
    }
  };
}
