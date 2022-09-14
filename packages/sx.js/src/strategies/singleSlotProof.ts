import { defaultProvider } from 'starknet';
import { utils } from '..';
import type { Call } from 'starknet';
import type {
  ClientConfig,
  Envelope,
  Strategy,
  VanillaProposeMessage,
  VanillaVoteMessage
} from '../types';
import { getStorageVarAddress, offsetStorageVar } from '../utils/encoding';

const fossilL1HeadersStoreAddress =
  '0x6ca3d25e901ce1fff2a7dd4079a24ff63ca6bbf8ba956efc71c1467975ab78f';
const fossilFactRegistryAddress =
  '0x363108ac1521a47b4f7d82f8ba868199bc1535216bbedfc1b071ae93cc406fd';

const proposalRegistryStore = 'Voting_proposal_registry_store';
const strategyParamsStore = 'Voting_voting_strategy_params_store';
const timestampToEthBlockNumberStore = 'Timestamp_timestamp_to_eth_block_number';
const latestL1BlockStore = '_latest_l1_block';

const snapshotTimestampOffset = 3;

async function fetchStrategyParams(
  index: number,
  envelope: Envelope<VanillaProposeMessage | VanillaVoteMessage>
): Promise<string[]> {
  const lengthAddress = getStorageVarAddress(strategyParamsStore, index.toString(16), '0x0');
  const length = parseInt(
    (await defaultProvider.getStorageAt(envelope.data.message.space, lengthAddress)) as string,
    16
  );

  return Promise.all(
    [...Array(length)].map(async (_, i) => {
      const lengthAddress = getStorageVarAddress(
        strategyParamsStore,
        index.toString(16),
        (i + 1).toString(16)
      );

      return defaultProvider.getStorageAt(
        envelope.data.message.space,
        lengthAddress
      ) as Promise<string>;
    })
  );
}

async function getBlockStorage(
  call: 'propose' | 'vote',
  address: string,
  envelope: Envelope<VanillaProposeMessage | VanillaVoteMessage>
): Promise<[string, string]> {
  if (call === 'vote') {
    const proposalAddress = getStorageVarAddress(
      proposalRegistryStore,
      (envelope as Envelope<VanillaVoteMessage>).data.message.proposal.toString(16)
    );

    const timestamp = (await defaultProvider.getStorageAt(
      envelope.data.message.space,
      offsetStorageVar(proposalAddress, snapshotTimestampOffset)
    )) as string;

    return [address, getStorageVarAddress(timestampToEthBlockNumberStore, timestamp)];
  }

  return [fossilL1HeadersStoreAddress, getStorageVarAddress(latestL1BlockStore)];
}

async function fetchBlock(
  call: 'propose' | 'vote',
  address: string,
  envelope: Envelope<VanillaProposeMessage | VanillaVoteMessage>
) {
  const [contractAddress, key] = await getBlockStorage(call, address, envelope);
  const block = parseInt((await defaultProvider.getStorageAt(contractAddress, key)) as string, 16);

  // 1 block offset due to
  // https://github.com/snapshot-labs/sx-core/blob/e994394a7109de5527786cb99e981e132122fad4/contracts/starknet/VotingStrategies/SingleSlotProof.cairo#L60
  return block - 1;
}

async function fetchProofInputs(
  call: 'propose' | 'vote',
  address: string,
  index: number,
  envelope: Envelope<VanillaProposeMessage | VanillaVoteMessage>,
  clientConfig: ClientConfig
) {
  const [block, strategyParams] = await Promise.all([
    fetchBlock(call, address, envelope),
    fetchStrategyParams(index, envelope)
  ]);

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
        `0x${block.toString(16)}`
      ]
    })
  });

  const data = await response.json();
  if (data.error) throw new Error('Failed to fetch proofs');

  return utils.storageProofs.getProofInputs(block, data.result);
}

const singleSlotProofStrategy: Strategy = {
  type: 'singleSlotProof',
  async getParams(
    call: 'propose' | 'vote',
    address: string,
    index: number,
    envelope: Envelope<VanillaProposeMessage | VanillaVoteMessage>,
    clientConfig: ClientConfig
  ): Promise<string[]> {
    const proofInputs = await fetchProofInputs(call, address, index, envelope, clientConfig);

    return proofInputs.storageProofs[0];
  },
  async getExtraProposeCalls(
    address: string,
    index: number,
    envelope: Envelope<VanillaProposeMessage | VanillaVoteMessage>,
    clientConfig: ClientConfig
  ): Promise<Call[]> {
    const proofInputs = await fetchProofInputs('propose', address, index, envelope, clientConfig);

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
