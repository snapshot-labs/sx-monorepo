import { Account, hash } from 'starknet';
import { IntsSequence } from '../../utils/ints-sequence';
import { getVoteCalldata, getProposeCalldata } from '../../utils/encoding';
import { getStrategies, getStrategiesParams, getExtraProposeCalls } from '../../utils/strategies';
import { getAuthenticator } from '../../authenticators';
import { defaultNetwork } from '../../networks';
import type {
  EthSigProposeMessage,
  EthSigVoteMessage,
  VanillaVoteMessage,
  VanillaProposeMessage,
  Envelope,
  ClientOpts,
  ClientConfig,
  StrategiesAddresses
} from '../../types';

const { getSelectorFromName } = hash;

export class StarkNetTx {
  config: ClientConfig;

  constructor(opts: ClientOpts) {
    this.config = {
      networkConfig: defaultNetwork,
      ...opts
    };
  }

  async getProposeCalldata(
    strategiesAddresses: StrategiesAddresses,
    envelope: Envelope<VanillaProposeMessage | EthSigProposeMessage>
  ) {
    const { address, data } = envelope;
    const { strategies, executor, metadataUri, executionParams } = data.message;

    const strategiesParams = await getStrategiesParams(
      'propose',
      strategiesAddresses,
      envelope.address,
      envelope.data.message,
      this.config
    );

    return getProposeCalldata(
      address,
      IntsSequence.LEFromString(metadataUri),
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

    const strategiesParams = await getStrategiesParams(
      'vote',
      strategiesAddresses,
      envelope.address,
      envelope.data.message,
      this.config
    );

    return getVoteCalldata(address, proposal, choice, strategies, strategiesParams);
  }

  async propose(
    account: Account,
    envelope: Envelope<VanillaProposeMessage | EthSigProposeMessage>
  ) {
    const authenticator = getAuthenticator(
      envelope.data.message.authenticator,
      this.config.networkConfig
    );
    if (!authenticator) {
      throw new Error('Invalid authenticator');
    }

    const strategiesAddresses = await getStrategies(envelope.data.message, this.config);

    const calldata = await this.getProposeCalldata(strategiesAddresses, envelope);
    const call = authenticator.createCall(envelope, getSelectorFromName('propose'), calldata);
    const extraCalls = await getExtraProposeCalls(
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
    const authenticator = getAuthenticator(
      envelope.data.message.authenticator,
      this.config.networkConfig
    );
    if (!authenticator) {
      throw new Error('Invalid authenticator');
    }

    const strategiesAddresses = await getStrategies(envelope.data.message, this.config);
    const calldata = await this.getVoteCalldata(strategiesAddresses, envelope);
    const call = authenticator.createCall(envelope, getSelectorFromName('vote'), calldata);

    const fee = await account.estimateFee(call);
    return account.execute(call, undefined, {
      maxFee: fee.suggestedMaxFee
    });
  }
}
