import { Contract } from '@ethersproject/contracts';
import { Provider } from '@ethersproject/providers';
import ICompAbi from './abis/IComp.json';
import { Strategy } from '../../clients/evm/types';

export default function createCompStrategy(): Strategy {
  return {
    type: 'comp',
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
      const compContract = new Contract(params, ICompAbi, provider);

      const votingPower = await compContract.getCurrentVotes(voterAddress, {
        blockTag: block ?? 'latest'
      });

      return BigInt(votingPower.toString());
    }
  };
}
