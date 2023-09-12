/* eslint-disable @typescript-eslint/no-unused-vars */

import { Contract, type Call } from 'starknet';
import ERC20VotesTokenAbi from './abis/ERC20VotesToken.json';
import type { ClientConfig, Envelope, Strategy, Propose, Vote } from '../../types';
import { getUserAddressEnum } from '../../utils/starknet-enums';

export default function createErc20VotesStrategy(): Strategy {
  return {
    type: 'erc20Votes',
    async getParams(
      call: 'propose' | 'vote',
      signerAddress: string,
      address: string,
      index: number,
      metadata: Record<string, any> | null,
      envelope: Envelope<Propose | Vote>,
      clientConfig: ClientConfig
    ): Promise<string[]> {
      return [];
    },
    async getExtraProposeCalls(
      address: string,
      index: number,
      envelope: Envelope<Propose | Vote>,
      clientConfig: ClientConfig
    ): Promise<Call[]> {
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

      const contract = new Contract(ERC20VotesTokenAbi, params[0], clientConfig.starkProvider);

      if (timestamp) {
        return contract.get_past_votes(voterAddress, timestamp);
      }

      return contract.get_votes(voterAddress);
    }
  };
}
