import { Account, hash } from 'starknet';
import constants from './constants';
import * as utils from '../../utils';
import { getAuthenticator } from '../../authenticators';
import { getStrategy } from '../../strategies';
import {
  EthSigProposeMessage,
  EthSigVoteMessage,
  VanillaVoteMessage,
  VanillaProposeMessage,
  Message,
  Envelope,
  ClientConfig
} from '../../types';

const { getSelectorFromName } = hash;

export class StarkNetTx {
  config: ClientConfig;

  constructor(options: { ethUrl: string }) {
    this.config = {
      ethUrl: options.ethUrl
    };
  }

  async getStrategiesParams(call: 'propose' | 'vote', envelope: Envelope<Message>) {
    const { strategies } = envelope.data.message;

    return Promise.all(
      strategies.map((address) => {
        const strategy = getStrategy(address);
        if (!strategy) throw new Error('Invalid strategy');

        return strategy.getParams(call, address, envelope, this.config);
      })
    );
  }

  async getExtraProposeCalls(envelope: Envelope<Message>) {
    const { strategies } = envelope.data.message;

    const extraCalls = await Promise.all(
      strategies.map((address) => {
        const strategy = getStrategy(address);
        if (!strategy) throw new Error('Invalid strategy');

        return strategy.getExtraProposeCalls(address, envelope, this.config);
      })
    );

    return extraCalls.flat();
  }

  async getProposeCalldata(envelope: Envelope<VanillaProposeMessage | EthSigProposeMessage>) {
    const { address, data } = envelope;
    const { strategies, metadataURI, executionParams } = data.message;

    const strategiesParams = await this.getStrategiesParams('propose', envelope);

    return utils.encoding.getProposeCalldata(
      address,
      utils.intsSequence.IntsSequence.LEFromString(metadataURI),
      constants.executor,
      strategies,
      strategiesParams,
      executionParams
    );
  }

  async getVoteCalldata(envelope: Envelope<VanillaVoteMessage | EthSigVoteMessage>) {
    const { address, data } = envelope;
    const { strategies, proposal, choice } = data.message;

    const strategiesParams = await this.getStrategiesParams('vote', envelope);

    return utils.encoding.getVoteCalldata(address, proposal, choice, strategies, strategiesParams);
  }

  async propose(
    account: Account,
    envelope: Envelope<VanillaProposeMessage | EthSigProposeMessage>
  ) {
    const authenticator = getAuthenticator(envelope.data.message.authenticator);
    if (!authenticator) {
      throw new Error('Invalid authenticator');
    }

    const calldata = await this.getProposeCalldata(envelope);
    const call = authenticator.createCall(envelope, getSelectorFromName('propose'), calldata);
    const extraCalls = await this.getExtraProposeCalls(envelope);

    const calls = [...extraCalls, call];

    const fee = await account.estimateFee(calls);
    return account.execute(calls, undefined, {
      maxFee: fee.suggestedMaxFee
    });
  }

  async vote(account: Account, envelope: Envelope<VanillaVoteMessage | EthSigVoteMessage>) {
    const authenticator = getAuthenticator(envelope.data.message.authenticator);
    if (!authenticator) {
      throw new Error('Invalid authenticator');
    }

    const calldata = await this.getVoteCalldata(envelope);
    const call = authenticator.createCall(envelope, getSelectorFromName('vote'), calldata);

    const fee = await account.estimateFee(call);
    return account.execute(call, undefined, {
      maxFee: fee.suggestedMaxFee
    });
  }
}
