/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  ClientConfig,
  Envelope,
  Propose,
  Strategy,
  Vote
} from '../../clients/starknet/types';

export default function createVanillaStrategy(): Strategy {
  return {
    type: 'vanilla',
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
      return ['0x0'];
    },
    async getVotingPower(): Promise<bigint> {
      return 1n;
    }
  };
}
