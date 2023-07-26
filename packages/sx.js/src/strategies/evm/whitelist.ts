import { AbiCoder } from '@ethersproject/abi';
import { Strategy, StrategyConfig, Propose, Vote } from '../../clients/evm/types';

export default function createWhitelistStrategy(): Strategy {
  return {
    type: 'whitelist',
    async getParams(
      call: 'propose' | 'vote',
      strategyConfig: StrategyConfig,
      signerAddress: string,
      data: Propose | Vote
    ): Promise<string> {
      if (typeof data.extraProperties?.voterIndex === 'undefined') {
        throw new Error('voterIndex is required for whitelist strategy');
      }

      const abiCoder = new AbiCoder();
      return abiCoder.encode(['uint256'], [data.extraProperties.voterIndex]);
    },
    async getVotingPower(
      strategyAddress: string,
      voterAddress: string,
      block: number,
      params: string
    ): Promise<bigint> {
      const abiCoder = new AbiCoder();
      const whitelistParams = abiCoder.decode(['tuple(address addr, uint256 vp)[]'], params);

      const match = whitelistParams[0].find(
        (entry: any) => entry.addr.toLowerCase() === voterAddress.toLowerCase()
      );

      if (match) {
        return BigInt(match.vp.toString());
      }

      return 0n;
    }
  };
}
