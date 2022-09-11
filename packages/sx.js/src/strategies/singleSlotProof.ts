import { defaultProvider } from 'starknet';
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
import { getStorageVarAddress } from '../utils/encoding';

const strategyParamsStore = 'Voting_voting_strategy_params_store';
const fossilFactRegistryAddress =
  '0x363108ac1521a47b4f7d82f8ba868199bc1535216bbedfc1b071ae93cc406fd';

async function fetchStrategyParams(
  address: string,
  envelope: Envelope<VanillaProposeMessage | VanillaVoteMessage>
): Promise<string[]> {
  const lengthAddress = getStorageVarAddress(strategyParamsStore, address, '0x0');
  const length = parseInt(
    (await defaultProvider.getStorageAt(envelope.data.message.space, lengthAddress)) as string,
    16
  );

  return Promise.all(
    [...Array(length)].map(async (_, i) => {
      const lengthAddress = getStorageVarAddress(
        strategyParamsStore,
        address,
        (i + 1).toString(16)
      );

      return defaultProvider.getStorageAt(
        envelope.data.message.space,
        lengthAddress
      ) as Promise<string>;
    })
  );
}

async function fetchProof(
  address: string,
  envelope: Envelope<VanillaProposeMessage | VanillaVoteMessage>,
  metadata: Metadata,
  clientConfig: ClientConfig
) {
  const strategyParams = await fetchStrategyParams(address, envelope);

  const response = await fetch(clientConfig.ethUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getProof',
      params: [
        strategyParams[0],
        [utils.encoding.getSlotKey(envelope.address, strategyParams[1])],
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
    address: string,
    envelope: Envelope<VanillaProposeMessage | VanillaVoteMessage>,
    metadata: Metadata,
    clientConfig: ClientConfig
  ): Promise<string[]> {
    const proof = await fetchProof(address, envelope, metadata, clientConfig);
    const proofInputs = utils.storageProofs.getProofInputs(metadata.block, proof);

    return proofInputs.storageProofs[0];
  },
  async getExtraProposeCalls(
    address: string,
    envelope: Envelope<VanillaProposeMessage | VanillaVoteMessage>,
    metadata: Metadata,
    clientConfig: ClientConfig
  ): Promise<Call[]> {
    const proof = await fetchProof(address, envelope, metadata, clientConfig);
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
