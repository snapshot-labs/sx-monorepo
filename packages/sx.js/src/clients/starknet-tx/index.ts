import {
  Abi,
  Account,
  AddTransactionResponse,
  Contract,
  defaultProvider as provider,
  hash
} from 'starknet';
import vanillaAbi from './abi/auth-vanilla.json';
import ethSigAbi from './abi/auth-eth-sig.json';
import constants from './constants.json';
import * as utils from '../../utils';
import {
  EthSigProposeMessage,
  EthSigVoteMessage,
  VanillaVoteMessage,
  VanillaProposeMessage,
  Envelope
} from '../../types';

const { getSelectorFromName } = hash;

export class StarkNetTx {
  getAuthenticatorType(address: string): 'vanilla' | 'ethSig' | null {
    const type = constants.authenticators[address];

    if (type !== 'vanilla' && type !== 'ethSig') return null;
    return type;
  }

  getProposeCalldata(envelope: Envelope<VanillaProposeMessage | EthSigProposeMessage>) {
    const { address, data } = envelope;
    const { metadataURI, executionParams } = data.message;

    return utils.encoding.getProposeCalldata(
      address,
      utils.intsSequence.IntsSequence.LEFromString(metadataURI),
      constants.executor,
      [constants.strategies.vanilla],
      [[]],
      executionParams
    );
  }

  getVoteCalldata(envelope: Envelope<VanillaVoteMessage | EthSigVoteMessage>) {
    const { address, data } = envelope;
    const { proposal, choice } = data.message;

    return utils.encoding.getVoteCalldata(
      address,
      proposal.toString(16),
      Number(choice),
      [constants.strategies.vanilla],
      [[]]
    );
  }

  async proposeVanilla(
    account: Account,
    envelope: Envelope<VanillaProposeMessage>
  ): Promise<AddTransactionResponse> {
    const { space, authenticator } = envelope.data.message;
    const calldata = this.getProposeCalldata(envelope);

    const auth = new Contract(vanillaAbi as Abi, authenticator, provider);
    auth.connect(account);

    const fee = await auth.estimateFee.authenticate(
      space,
      getSelectorFromName('propose'),
      calldata
    );

    return await auth.invoke('authenticate', [space, getSelectorFromName('propose'), calldata], {
      maxFee: fee.suggestedMaxFee
    });
  }

  async proposeEthSig(
    account: Account,
    envelope: Envelope<EthSigProposeMessage>
  ): Promise<AddTransactionResponse> {
    const { sig, data } = envelope;
    const { space, authenticator, salt } = data.message;
    const { r, s, v } = utils.encoding.getRSVFromSig(sig);
    const rawSalt = utils.splitUint256.SplitUint256.fromHex(`0x${salt.toString(16)}`);
    const calldata = this.getProposeCalldata(envelope);

    const auth = new Contract(ethSigAbi as Abi, authenticator, provider);
    auth.connect(account);

    const fee = await auth.estimateFee.authenticate(
      r,
      s,
      v,
      rawSalt,
      space,
      getSelectorFromName('propose'),
      calldata
    );

    return await auth.invoke(
      'authenticate',
      [r, s, v, rawSalt, space, getSelectorFromName('propose'), calldata],
      {
        maxFee: fee.suggestedMaxFee
      }
    );
  }

  async voteVanilla(
    account: Account,
    envelope: Envelope<VanillaVoteMessage>
  ): Promise<AddTransactionResponse> {
    const { space, authenticator } = envelope.data.message;
    const calldata = this.getVoteCalldata(envelope);

    const auth = new Contract(vanillaAbi as Abi, authenticator, provider);
    auth.connect(account);

    const fee = await auth.estimateFee.authenticate(space, getSelectorFromName('vote'), calldata);

    return await auth.invoke('authenticate', [space, getSelectorFromName('vote'), calldata], {
      maxFee: fee.suggestedMaxFee
    });
  }

  async voteEthSig(
    account: Account,
    envelope: Envelope<EthSigVoteMessage>
  ): Promise<AddTransactionResponse> {
    const { sig, data } = envelope;
    const { space, authenticator, salt } = data.message;
    const { r, s, v } = utils.encoding.getRSVFromSig(sig);
    const rawSalt = utils.splitUint256.SplitUint256.fromHex(`0x${salt.toString(16)}`);
    const calldata = this.getVoteCalldata(envelope);

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
    const authenticatorType = this.getAuthenticatorType(envelope.data.message.authenticator);

    if (authenticatorType === 'ethSig') {
      return this.proposeEthSig(account, envelope as Envelope<EthSigProposeMessage>);
    } else if (authenticatorType === 'vanilla') {
      return this.proposeVanilla(account, envelope as Envelope<VanillaProposeMessage>);
    } else {
      throw new Error('Invalid authenticator');
    }
  }

  async vote(account: Account, envelope: Envelope<VanillaVoteMessage | EthSigVoteMessage>) {
    const authenticatorType = this.getAuthenticatorType(envelope.data.message.authenticator);

    if (authenticatorType === 'ethSig') {
      return this.voteEthSig(account, envelope as Envelope<EthSigVoteMessage>);
    } else if (authenticatorType === 'vanilla') {
      return this.voteVanilla(account, envelope as Envelope<VanillaVoteMessage>);
    } else {
      throw new Error('Invalid authenticator');
    }
  }
}
