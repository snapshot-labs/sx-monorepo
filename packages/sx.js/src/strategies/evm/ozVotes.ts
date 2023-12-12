import { Contract } from '@ethersproject/contracts';
import IVotes from './abis/IVotes.json';
import type { Provider } from '@ethersproject/providers';
import type { Strategy } from '../../clients/evm/types';

export default function createOzVotesStrategy(): Strategy {
  return {
    type: 'ozVotes',
    async getParams(): Promise<string> {
      return '0x00';
    },
    async getVotingPower(
      spaceAddress: string,
      strategyAddress: string,
      voterAddress: string,
      metadata: Record<string, any> | null,
      block: number,
      params: string,
      provider: Provider
    ): Promise<bigint> {
      const votesContract = new Contract(params, IVotes, provider);

      const votingPower = await votesContract.getVotes(voterAddress, { blockTag: block });

      return BigInt(votingPower.toString());
    }
  };
}
