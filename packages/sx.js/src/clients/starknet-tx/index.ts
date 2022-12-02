import { Account, hash } from 'starknet';
import * as utils from '../../utils';
import { getAuthenticator } from '../../authenticators';
import type {
  EthSigProposeMessage,
  EthSigVoteMessage,
  VanillaVoteMessage,
  VanillaProposeMessage,
  Envelope,
  ClientConfig,
  StrategiesAddresses
} from '../../types';

const { getSelectorFromName } = hash;

export class StarkNetTx {
  config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
  }

  async getProposeCalldata(
    strategiesAddresses: StrategiesAddresses,
    envelope: Envelope<VanillaProposeMessage | EthSigProposeMessage>
  ) {
    const { address, data } = envelope;
    const { strategies, executor, metadataUri, executionParams } = data.message;

    const strategiesParams = await utils.strategies.getStrategiesParams(
      'propose',
      strategiesAddresses,
      envelope.address,
      envelope.data.message,
      this.config
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
    strategiesAddresses: StrategiesAddresses,
    envelope: Envelope<VanillaVoteMessage | EthSigVoteMessage>
  ) {
    const { address, data } = envelope;
    const { strategies, proposal, choice } = data.message;

    const strategiesParams = await utils.strategies.getStrategiesParams(
      'vote',
      strategiesAddresses,
      envelope.address,
      envelope.data.message,
      this.config
    );

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

    const strategiesAddresses = await utils.strategies.getStrategies(
      envelope.data.message,
      this.config
    );

    const calldata = await this.getProposeCalldata(strategiesAddresses, envelope);
    const call = authenticator.createCall(envelope, getSelectorFromName('propose'), calldata);
    const extraCalls = await utils.strategies.getExtraProposeCalls(
      strategiesAddresses,
      envelope.address,
      envelope.data.message,
      this.config
    );

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

    const strategiesAddresses = await utils.strategies.getStrategies(
      envelope.data.message,
      this.config
    );
    const calldata = await this.getVoteCalldata(strategiesAddresses, envelope);
    const call = authenticator.createCall(envelope, getSelectorFromName('vote'), calldata);

    const fee = await account.estimateFee(call);
    return account.execute(call, undefined, {
      maxFee: fee.suggestedMaxFee
    });
  }
}
