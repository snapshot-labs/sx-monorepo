import { Account, defaultProvider, hash } from 'starknet';
import * as utils from '../../utils';
import { getAuthenticator } from '../../authenticators';
import { getStrategy } from '../../strategies';
import type {
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

  constructor(config: ClientConfig) {
    this.config = config;
  }

  async getStrategiesAddresses(envelope: Envelope<Message>) {
    return Promise.all(
      envelope.data.message.strategies.map(
        (id) =>
          defaultProvider.getStorageAt(
            envelope.data.message.space,
            utils.encoding.getStorageVarAddress('Voting_voting_strategies_store', id.toString(16))
          ) as Promise<string>
      )
    );
  }

  async getStrategiesParams(
    call: 'propose' | 'vote',
    strategiesAddresses: string[],
    envelope: Envelope<Message>
  ) {
    return Promise.all(
      strategiesAddresses.map((address, index) => {
        const strategy = getStrategy(address);
        if (!strategy) throw new Error('Invalid strategy');

        return strategy.getParams(call, address, index, envelope, this.config);
      })
    );
  }

  async getExtraProposeCalls(strategiesAddresses: string[], envelope: Envelope<Message>) {
    const extraCalls = await Promise.all(
      strategiesAddresses.map((address, index) => {
        const strategy = getStrategy(address);
        if (!strategy) throw new Error('Invalid strategy');

        return strategy.getExtraProposeCalls(address, index, envelope, this.config);
      })
    );

    return extraCalls.flat();
  }

  async getProposeCalldata(
    strategiesAddresses: string[],
    envelope: Envelope<VanillaProposeMessage | EthSigProposeMessage>
  ) {
    const { address, data } = envelope;
    const { strategies, executor, metadataUri, executionParams } = data.message;

    const strategiesParams = await this.getStrategiesParams(
      'propose',
      strategiesAddresses,
      envelope
    );

    return utils.encoding.getProposeCalldata(
      address,
      utils.intsSequence.IntsSequence.LEFromString(metadataUri),
      executor,
      strategies,
      strategiesParams,
      executionParams
    );
  }

  async getVoteCalldata(
    strategiesAddresses: string[],
    envelope: Envelope<VanillaVoteMessage | EthSigVoteMessage>
  ) {
    const { address, data } = envelope;
    const { strategies, proposal, choice } = data.message;

    const strategiesParams = await this.getStrategiesParams('vote', strategiesAddresses, envelope);

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

    const strategiesAddresses = await this.getStrategiesAddresses(envelope);
    const calldata = await this.getProposeCalldata(strategiesAddresses, envelope);
    const call = authenticator.createCall(envelope, getSelectorFromName('propose'), calldata);
    const extraCalls = await this.getExtraProposeCalls(strategiesAddresses, envelope);

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

    const strategiesAddresses = await this.getStrategiesAddresses(envelope);
    const calldata = await this.getVoteCalldata(strategiesAddresses, envelope);
    const call = authenticator.createCall(envelope, getSelectorFromName('vote'), calldata);

    const fee = await account.estimateFee(call);
    return account.execute(call, undefined, {
      maxFee: fee.suggestedMaxFee
    });
  }
}
