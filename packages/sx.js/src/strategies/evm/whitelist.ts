import { AbiCoder } from '@ethersproject/abi';
import type { Strategy } from '../../clients/evm/types';

export default function createWhitelistStrategy(): Strategy {
  return {
    type: 'whitelist',
    async getParams(): Promise<string> {
      return '0x00';
    },
    async getVotingPower(
      strategyAddress: string,
      voterAddress: string,
      timestamp: number,
      params: string
    ): Promise<bigint> {
      const abiCoder = new AbiCoder();
      const whitelistParams = abiCoder.decode(['tuple(address addy, uint256 vp)[]'], params);

      const match = whitelistParams[0].find(
        (entry: any) => entry.addy.toLowerCase() === voterAddress.toLowerCase()
      );

      if (match) {
        return BigInt(match.vp.toString());
      }

      return 0n;
    }
  };
}
