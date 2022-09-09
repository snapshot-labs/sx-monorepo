import { Account, Call, hash } from 'starknet';
import constants from './constants';
import * as utils from '../../utils';
import { getAuthenticator } from '../../authenticators';
import { getStrategyType } from './contracts';
import {
  EthSigProposeMessage,
  EthSigVoteMessage,
  VanillaVoteMessage,
  VanillaProposeMessage,
  Message,
  Envelope,
  Metadata
} from '../../types';

const { getSelectorFromName } = hash;

const TEMP_CONSTANTS = {
  strategyParams: ['0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6', '0x3'],
  block: 7541970
};

export class StarkNetTx {
  ethUrl: string;

  constructor(options: { ethUrl: string }) {
    this.ethUrl = options.ethUrl;
  }

  async getSingleSlotProofs(envelope: Envelope<Message>, metadata: Metadata) {
    const singleSlotProofStrategies = envelope.data.message.strategies.filter(
      (strategy) => getStrategyType(strategy) === 'singleSlotProof'
    );

    if (singleSlotProofStrategies.length === 0) return [];

    const response = await fetch(this.ethUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        singleSlotProofStrategies.map((strategy, i) => ({
          jsonrpc: '2.0',
          method: 'eth_getProof',
          params: [
            metadata.strategyParams[0],
            [utils.encoding.getSlotKey(envelope.address, metadata.strategyParams[1])],
            `0x${metadata.block.toString(16)}`
          ],
          id: i
        }))
      )
    });

    const data = await response.json();

    return data.map((entry) => entry.result);
  }

  async getStrategiesParams(envelope: Envelope<Message>, metadata: Metadata) {
    const proofs = await this.getSingleSlotProofs(envelope, metadata);

    let proofsCounter = 0;
    return envelope.data.message.strategies.map((strategy) => {
      const type = getStrategyType(strategy);

      if (!type) throw new Error('Invalid strategy');

      if (type === 'singleSlotProof') {
        const proofInputs = utils.storageProofs.getProofInputs(
          metadata.block,
          proofs[proofsCounter++]
        );

        return proofInputs.storageProofs[0];
      }

      return [];
    });
  }

  async getProposeCalldata(
    envelope: Envelope<VanillaProposeMessage | EthSigProposeMessage>,
    metadata: Metadata
  ) {
    const { address, data } = envelope;
    const { strategies, metadataURI, executionParams } = data.message;

    const strategiesParams = await this.getStrategiesParams(envelope, metadata);

    return utils.encoding.getProposeCalldata(
      address,
      utils.intsSequence.IntsSequence.LEFromString(metadataURI),
      constants.executor,
      strategies,
      strategiesParams,
      executionParams
    );
  }

  async getVoteCalldata(
    envelope: Envelope<VanillaVoteMessage | EthSigVoteMessage>,
    metadata: Metadata
  ) {
    const { address, data } = envelope;
    const { strategies, proposal, choice } = data.message;

    const strategiesParams = await this.getStrategiesParams(envelope, metadata);

    return utils.encoding.getVoteCalldata(
      address,
      proposal.toString(16),
      Number(choice),
      strategies,
      strategiesParams
    );
  }

  async getProveAccountCalls(
    envelope: Envelope<VanillaProposeMessage | EthSigProposeMessage>,
    metadata: Metadata
  ): Promise<Call[]> {
    const singleSlotProofs = await this.getSingleSlotProofs(envelope, metadata);

    return singleSlotProofs.map((proof) => {
      const proofInputs = utils.storageProofs.getProofInputs(metadata.block, proof);

      return {
        contractAddress: constants.fossilFactRegistryAddress,
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
      };
    });
  }

  async propose(
    account: Account,
    envelope: Envelope<VanillaProposeMessage | EthSigProposeMessage>
  ) {
    // TODO: fetch from network once possible
    const metadata = TEMP_CONSTANTS;

    const authenticator = getAuthenticator(envelope.data.message.authenticator);
    if (!authenticator) {
      throw new Error('Invalid authenticator');
    }

    const calldata = await this.getProposeCalldata(envelope, metadata);
    const call = authenticator.createCall(envelope, getSelectorFromName('propose'), calldata);

    const proveCalls = await this.getProveAccountCalls(envelope, metadata);

    const calls = [...proveCalls, call];

    const fee = await account.estimateFee(calls);
    return account.execute(calls, undefined, {
      maxFee: fee.suggestedMaxFee
    });
  }

  async vote(account: Account, envelope: Envelope<VanillaVoteMessage | EthSigVoteMessage>) {
    // TODO: fetch from network once possible
    const metadata = TEMP_CONSTANTS;

    const authenticator = getAuthenticator(envelope.data.message.authenticator);
    if (!authenticator) {
      throw new Error('Invalid authenticator');
    }

    const calldata = await this.getVoteCalldata(envelope, metadata);
    const call = authenticator.createCall(envelope, getSelectorFromName('vote'), calldata);

    const fee = await account.estimateFee(call);
    return account.execute(call, undefined, {
      maxFee: fee.suggestedMaxFee
    });
  }
}
