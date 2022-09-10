/* eslint-disable @typescript-eslint/no-unused-vars */

import type { Call } from 'starknet';
import type {
  ClientConfig,
  Envelope,
  Metadata,
  Strategy,
  VanillaProposeMessage,
  VanillaVoteMessage
} from '../types';

const vanillaStrategy: Strategy = {
  type: 'vanilla',
  async getParams(
    envelope: Envelope<VanillaProposeMessage | VanillaVoteMessage>,
    metadata: Metadata,
    clientConfig: ClientConfig
  ): Promise<string[]> {
    return [];
  },
  async getExtraProposeCalls(
    envelope: Envelope<VanillaProposeMessage | VanillaVoteMessage>,
    metadata: Metadata,
    clientConfig: ClientConfig
  ): Promise<Call[]> {
    return [];
  }
};

export default vanillaStrategy;
