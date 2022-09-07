import {
  Abi,
  Account,
  InvokeFunctionResponse,
  Contract,
  defaultProvider as provider,
  hash
} from 'starknet';
import vanillaAbi from './abi/auth-vanilla.json';
import ethSigAbi from './abi/auth-eth-sig.json';
import constants from './constants';
import * as utils from '../../utils';
import { getAuthenticatorType, getStrategyType } from './contracts';
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
  ) {
    const singleSlotProofs = await this.getSingleSlotProofs(envelope, metadata);

    return singleSlotProofs.map((proof) => {
      const proofInputs = utils.storageProofs.getProofInputs(TEMP_CONSTANTS.block, proof);

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

  async proposeVanilla(
    account: Account,
    envelope: Envelope<VanillaProposeMessage>,
    metadata: Metadata
  ): Promise<InvokeFunctionResponse> {
    const { space, authenticator } = envelope.data.message;
    const calldata = await this.getProposeCalldata(envelope, metadata);
    const proveCalls = await this.getProveAccountCalls(envelope, metadata);

    const calls = [
      ...proveCalls,
      {
        contractAddress: authenticator,
        entrypoint: 'authenticate',
        calldata: [space, getSelectorFromName('propose'), calldata.length, ...calldata]
      }
    ];

    const fee = await account.estimateFee(calls);

    return account.execute(calls, undefined, {
      maxFee: fee.suggestedMaxFee
    });
  }

  async proposeEthSig(
    account: Account,
    envelope: Envelope<EthSigProposeMessage>,
    metadata: Metadata
  ): Promise<InvokeFunctionResponse> {
    const { sig, data } = envelope;
    const { space, authenticator, salt } = data.message;
    const { r, s, v } = utils.encoding.getRSVFromSig(sig);
    const rawSalt = utils.splitUint256.SplitUint256.fromHex(`0x${salt.toString(16)}`);
    const calldata = await this.getProposeCalldata(envelope, metadata);
    const proveCalls = await this.getProveAccountCalls(envelope, metadata);

    const calls = [
      ...proveCalls,
      {
        contractAddress: authenticator,
        entrypoint: 'authenticate',
        calldata: [
          r.low,
          r.high,
          s.low,
          s.high,
          v,
          rawSalt.low,
          rawSalt.high,
          space,
          getSelectorFromName('propose'),
          calldata.length,
          ...calldata
        ]
      }
    ];

    const fee = await account.estimateFee(calls);

    return account.execute(calls, undefined, {
      maxFee: fee.suggestedMaxFee
    });
  }

  async voteVanilla(
    account: Account,
    envelope: Envelope<VanillaVoteMessage>,
    metadata: Metadata
  ): Promise<InvokeFunctionResponse> {
    const { space, authenticator } = envelope.data.message;
    const calldata = await this.getVoteCalldata(envelope, metadata);

    const auth = new Contract(vanillaAbi as Abi, authenticator, provider);
    auth.connect(account);

    const fee = await auth.estimateFee.authenticate(space, getSelectorFromName('vote'), calldata);

    return await auth.invoke('authenticate', [space, getSelectorFromName('vote'), calldata], {
      maxFee: fee.suggestedMaxFee
    });
  }

  async voteEthSig(
    account: Account,
    envelope: Envelope<EthSigVoteMessage>,
    metadata: Metadata
  ): Promise<InvokeFunctionResponse> {
    const { sig, data } = envelope;
    const { space, authenticator, salt } = data.message;
    const { r, s, v } = utils.encoding.getRSVFromSig(sig);
    const rawSalt = utils.splitUint256.SplitUint256.fromHex(`0x${salt.toString(16)}`);
    const calldata = await this.getVoteCalldata(envelope, metadata);

    const auth = new Contract(ethSigAbi as Abi, authenticator, provider);
    auth.connect(account);

    const fee = await auth.estimateFee.authenticate(
      r,
      s,
      v,
      rawSalt,
      space,
      getSelectorFromName('vote'),
      calldata
    );

    return await auth.invoke(
      'authenticate',
      [r, s, v, rawSalt, space, getSelectorFromName('vote'), calldata],
      {
        maxFee: fee.suggestedMaxFee
      }
    );
  }

  async propose(
    account: Account,
    envelope: Envelope<VanillaProposeMessage | EthSigProposeMessage>
  ) {
    const authenticatorType = getAuthenticatorType(envelope.data.message.authenticator);

    // TODO: fetch from network once possible
    const metadata = TEMP_CONSTANTS;

    if (authenticatorType === 'ethSig') {
      return this.proposeEthSig(account, envelope as Envelope<EthSigProposeMessage>, metadata);
    } else if (authenticatorType === 'vanilla') {
      return this.proposeVanilla(account, envelope as Envelope<VanillaProposeMessage>, metadata);
    } else {
      throw new Error('Invalid authenticator');
    }
  }

  async vote(account: Account, envelope: Envelope<VanillaVoteMessage | EthSigVoteMessage>) {
    const authenticatorType = getAuthenticatorType(envelope.data.message.authenticator);

    // TODO: fetch from network once possible
    const metadata = TEMP_CONSTANTS;

    if (authenticatorType === 'ethSig') {
      return this.voteEthSig(account, envelope as Envelope<EthSigVoteMessage>, metadata);
    } else if (authenticatorType === 'vanilla') {
      return this.voteVanilla(account, envelope as Envelope<VanillaVoteMessage>, metadata);
    } else {
      throw new Error('Invalid authenticator');
    }
  }
}
