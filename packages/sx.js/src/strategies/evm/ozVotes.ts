import { Contract } from '@ethersproject/contracts';
import IVotes from './abis/IVotes.json';
import OzVotesVotingStrategy from './abis/OzVotesVotingStrategy.json';
import type { Provider } from '@ethersproject/providers';
import type { Strategy } from '../../clients/evm/types';

export default function createOzVotesStrategy(): Strategy {
  return {
    type: 'ozVotes',
    async getParams(): Promise<string> {
      return '0x00';
    },
    async getVotingPower(
      strategyAddress: string,
      voterAddress: string,
      timestamp: number,
      params: string,
      provider: Provider
    ): Promise<bigint> {
      const votesContract = new Contract(params, IVotes, provider);
      const votingStrategyContract = new Contract(strategyAddress, OzVotesVotingStrategy, provider);

      const storedBlock = await votingStrategyContract.timestampToBlockNumber(timestamp);
      const blockTag = storedBlock.toNumber() > 1 ? storedBlock.toNumber() : undefined;

      const votingPower = await votesContract.getVotes(voterAddress, { blockTag });

      return BigInt(votingPower.toString());
    }
  };
}
