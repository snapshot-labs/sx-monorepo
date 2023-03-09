import { Contract } from '@ethersproject/contracts';
import ICompAbi from './abis/IComp.json';
import CompVotingStrtategyAbi from './abis/CompVotingStrategy.json';
import type { Provider } from '@ethersproject/providers';
import type { Strategy } from '../../clients/evm/types';

export default function createCompStrategy(): Strategy {
  return {
    type: 'comp',
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
      const compContract = new Contract(params, ICompAbi, provider);
      const votingStrategyContract = new Contract(
        strategyAddress,
        CompVotingStrtategyAbi,
        provider
      );

      const storedBlock = await votingStrategyContract.timestampToBlockNumber(timestamp);
      const blockTag = storedBlock.toNumber() > 1 ? storedBlock.toNumber() : undefined;

      const votingPower = await compContract.getCurrentVotes(voterAddress, { blockTag });

      return BigInt(votingPower.toString());
    }
  };
}
