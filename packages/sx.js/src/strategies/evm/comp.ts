import { Contract } from '@ethersproject/contracts';
import type { Strategy } from '../../clients/evm/types';
import type { Provider } from '@ethersproject/providers';
import ICompAbi from './abis/IComp.json';

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
      block: number,
      params: string,
      provider: Provider
    ): Promise<bigint> {
      const compContract = new Contract(params, ICompAbi, provider);

      const votingPower = await compContract.getCurrentVotes(voterAddress, {
        blockTag: block
      });

      return BigInt(votingPower.toString());
    }
  };
}
