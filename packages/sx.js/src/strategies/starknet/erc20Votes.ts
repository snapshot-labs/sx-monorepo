/* eslint-disable @typescript-eslint/no-unused-vars */

import { Contract } from 'starknet';
import ERC20VotesTokenAbi from './abis/ERC20VotesToken.json';
import {
  ClientConfig,
  Envelope,
  Propose,
  Strategy,
  Vote
} from '../../clients/starknet/types';

export default function createErc20VotesStrategy(): Strategy {
  return {
    type: 'erc20Votes',
    async getParams(
      call: 'propose' | 'vote',
      signerAddress: string,
      address: string,
      index: number,
      params: string,
      metadata: Record<string, any> | null,
      envelope: Envelope<Propose | Vote>,
      clientConfig: ClientConfig
    ): Promise<string[]> {
      const isEthereumAddress = signerAddress.length === 42;
      if (isEthereumAddress)
        throw new Error('Not supported for Ethereum addresses');

      return [];
    },
    async getVotingPower(
      strategyAddress: string,
      voterAddress: string,
      metadata: Record<string, any> | null,
      timestamp: number | null,
      params: string[],
      clientConfig: ClientConfig
    ): Promise<bigint> {
      const isEthereumAddress = voterAddress.length === 42;
      if (isEthereumAddress) return 0n;

      const [tokenAddress] = params;
      if (!tokenAddress) throw new Error('Missing token address');

      const contract = new Contract(
        ERC20VotesTokenAbi,
        tokenAddress,
        clientConfig.starkProvider
      );

      if (timestamp) {
        return contract.get_past_votes(voterAddress, timestamp);
      }

      return contract.get_votes(voterAddress);
    }
  };
}
