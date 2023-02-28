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
      const votingStrategyContract = new Contract(
        strategyAddress,
        CompVotingStrtategyAbi,
        provider
      );

      let block;
      const storedBlock = await votingStrategyContract.timestampToBlockNumber(timestamp);
      if (storedBlock.toNumber() > 1) block = storedBlock.toNumber();
      else {
        block = (await provider.getBlockNumber()) - 1;
      }

      const compContract = new Contract(params, ICompAbi, provider);
      const votingPower = await compContract.getPriorVotes(voterAddress, block);

      return BigInt(votingPower.toString());
    }
  };
}
