/* eslint-disable @typescript-eslint/no-unused-vars */

import type { Call } from 'starknet';
import type { ClientConfig, Envelope, Strategy, Propose, Vote } from '../../types';

export default function createVanillaStrategy(): Strategy {
  return {
    type: 'vanilla',
    async getParams(
      call: 'propose' | 'vote',
      signerAddress: string,
      address: string,
      index: number,
      metadata: Record<string, any> | null,
      envelope: Envelope<Propose | Vote>,
      clientConfig: ClientConfig
    ): Promise<string[]> {
      return ['0x0'];
    },
    async getExtraProposeCalls(
      address: string,
      index: number,
      envelope: Envelope<Propose | Vote>,
      clientConfig: ClientConfig
    ): Promise<Call[]> {
      return [];
    },
    async getVotingPower(): Promise<bigint> {
      return 1n;
    }
  };
}
