/* eslint-disable @typescript-eslint/no-unused-vars */

import type { Call } from 'starknet';
import type {
  ClientConfig,
  Envelope,
  Strategy,
  VanillaProposeMessage,
  VanillaVoteMessage
} from '../types';

const vanillaStrategy: Strategy = {
  type: 'vanilla',
  async getParams(
    call: 'propose' | 'vote',
    address: string,
    index: number,
    envelope: Envelope<VanillaProposeMessage | VanillaVoteMessage>,
    clientConfig: ClientConfig
  ): Promise<string[]> {
    return [];
  },
  async getExtraProposeCalls(
    address: string,
    index: number,
    envelope: Envelope<VanillaProposeMessage | VanillaVoteMessage>,
    clientConfig: ClientConfig
  ): Promise<Call[]> {
    return [];
  }
};

export default vanillaStrategy;
