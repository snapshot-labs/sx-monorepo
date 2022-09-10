import { utils } from '..';
import type { Call } from 'starknet';
import type {
  ClientConfig,
  Envelope,
  Metadata,
  Strategy,
  VanillaProposeMessage,
  VanillaVoteMessage
} from '../types';

const fossilFactRegistryAddress =
  '0x363108ac1521a47b4f7d82f8ba868199bc1535216bbedfc1b071ae93cc406fd';

async function fetchProof(
  envelope: Envelope<VanillaProposeMessage | VanillaVoteMessage>,
  metadata: Metadata,
  clientConfig: ClientConfig
) {
  const response = await fetch(clientConfig.ethUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getProof',
      params: [
        metadata.strategyParams[0],
        [utils.encoding.getSlotKey(envelope.address, metadata.strategyParams[1])],
        `0x${metadata.block.toString(16)}`
      ]
    })
  });

  const data = await response.json();
  if (data.error) throw new Error('Failed to fetch proofs');

  return data.result;
}

const singleSlotProofStrategy: Strategy = {
  type: 'singleSlotProof',
  async getParams(
    envelope: Envelope<VanillaProposeMessage | VanillaVoteMessage>,
    metadata: Metadata,
    clientConfig: ClientConfig
  ): Promise<string[]> {
    const proof = await fetchProof(envelope, metadata, clientConfig);
    const proofInputs = utils.storageProofs.getProofInputs(metadata.block, proof);

    return proofInputs.storageProofs[0];
  },
  async getExtraProposeCalls(
    envelope: Envelope<VanillaProposeMessage | VanillaVoteMessage>,
    metadata: Metadata,
    clientConfig: ClientConfig
  ): Promise<Call[]> {
    const proof = await fetchProof(envelope, metadata, clientConfig);
    const proofInputs = utils.storageProofs.getProofInputs(metadata.block, proof);

    return [
      {
        contractAddress: fossilFactRegistryAddress,
        entrypoint: 'prove_account',
        calldata: [
          proofInputs.accountOptions,
          proofInputs.blockNumber,
          proofInputs.ethAddress.values[0],
          proofInputs.ethAddress.values[1],
          proofInputs.ethAddress.values[2],
          proofInputs.accountProofSizesBytes.length,
          ...proofInputs.accountProofSizesBytes,
          proofInputs.accountProofSizesWords.length,
          ...proofInputs.accountProofSizesWords,
          proofInputs.accountProof.length,
          ...proofInputs.accountProof
        ]
      }
    ];
  }
};

export default singleSlotProofStrategy;
