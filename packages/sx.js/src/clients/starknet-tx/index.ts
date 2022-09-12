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
  Metadata,
  ClientConfig
} from '../../types';

const { getSelectorFromName } = hash;

const TEMP_CONSTANTS = {
  block: 7541970
};

export class StarkNetTx {
  config: ClientConfig;

  constructor(options: { ethUrl: string }) {
    this.config = {
      ethUrl: options.ethUrl
    };
  }

  async getStrategiesParams(envelope: Envelope<Message>, metadata: Metadata) {
    const { strategies } = envelope.data.message;

    return Promise.all(
      strategies.map((address) => {
        const strategy = getStrategy(address);
        if (!strategy) throw new Error('Invalid strategy');

        return strategy.getParams(address, envelope, metadata, this.config);
      })
    );
  }

  async getExtraProposeCalls(envelope: Envelope<Message>, metadata: Metadata) {
    const { strategies } = envelope.data.message;

    const extraCalls = await Promise.all(
      strategies.map((address) => {
        const strategy = getStrategy(address);
        if (!strategy) throw new Error('Invalid strategy');

        return strategy.getExtraProposeCalls(address, envelope, metadata, this.config);
      })
    );

    return extraCalls.flat();
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

    return utils.encoding.getVoteCalldata(address, proposal, choice, strategies, strategiesParams);
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
    const extraCalls = await this.getExtraProposeCalls(envelope, metadata);

    const calls = [...extraCalls, call];

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
