import {
  Signer,
  TypedDataField,
  TypedDataSigner
} from '@ethersproject/abstract-signer';
import randomBytes from 'randombytes';
import { CallData, shortString } from 'starknet';
import { proposeTypes, updateProposalTypes, voteTypes } from './types';
import { getRSVFromSig } from '../../../utils/encoding';
import { getStrategiesWithParams } from '../../../utils/strategies';
import {
  ClientConfig,
  ClientOpts,
  EIP712ProposeMessage,
  EIP712UpdateProposalMessage,
  EIP712VoteMessage,
  Envelope,
  Propose,
  SignatureData,
  UpdateProposal,
  Vote
} from '../types';

export class EthereumSig {
  config: ClientConfig;

  constructor(opts: ClientOpts) {
    this.config = opts;
  }

  generateSalt() {
    return `0x${randomBytes(4).toString('hex')}`;
  }

  public async sign<
    T extends
      | EIP712ProposeMessage
      | EIP712UpdateProposalMessage
      | EIP712VoteMessage
  >(
    signer: Signer & TypedDataSigner,
    message: T,
    types: Record<string, TypedDataField[]>,
    primaryType: string
  ): Promise<SignatureData> {
    const address = await signer.getAddress();

    const domain = {};

    const extendedMessage = {
      chainId: this.config.networkConfig.eip712ChainId,
      ...message
    };

    const signature = await signer._signTypedData(
      domain,
      types,
      extendedMessage
    );
    const { r, s, v } = getRSVFromSig(signature);

    return {
      address,
      signature: [r.toHex(), s.toHex(), v],
      message: extendedMessage,
      primaryType
    };
  }

  public async propose({
    signer,
    data
  }: {
    signer: Signer & TypedDataSigner;
    data: Propose;
  }): Promise<Envelope<Propose>> {
    const address = await signer.getAddress();

    const userStrategies = await getStrategiesWithParams(
      'propose',
      data.strategies,
      address,
      data,
      this.config
    );

    const message = {
      authenticator: data.authenticator,
      space: data.space,
      author: address,
      executionStrategy: {
        address: data.executionStrategy.addr,
        params: data.executionStrategy.params
      },
      userProposalValidationParams: CallData.compile({
        userStrategies
      }),
      metadataUri: shortString
        .splitLongString(data.metadataUri)
        .map(str => shortString.encodeShortString(str)),
      salt: this.generateSalt()
    };

    const signatureData = await this.sign(
      signer,
      message,
      proposeTypes,
      'Propose'
    );

    return {
      signatureData,
      data
    };
  }

  public async updateProposal({
    signer,
    data
  }: {
    signer: Signer & TypedDataSigner;
    data: UpdateProposal;
  }): Promise<Envelope<UpdateProposal>> {
    const address = await signer.getAddress();

    const message = {
      authenticator: data.authenticator,
      space: data.space,
      author: address,
      proposalId: `0x${data.proposal.toString(16)}`,
      executionStrategy: {
        address: data.executionStrategy.addr,
        params: data.executionStrategy.params
      },
      metadataUri: shortString
        .splitLongString(data.metadataUri)
        .map(str => shortString.encodeShortString(str)),
      salt: this.generateSalt()
    };

    const signatureData = await this.sign(
      signer,
      message,
      updateProposalTypes,
      'UpdateProposal'
    );

    return {
      signatureData,
      data
    };
  }

  public async vote({
    signer,
    data
  }: {
    signer: Signer & TypedDataSigner;
    data: Vote;
  }): Promise<Envelope<Vote>> {
    const address = await signer.getAddress();

    const userVotingStrategies = await getStrategiesWithParams(
      'vote',
      data.strategies,
      address,
      data,
      this.config
    );

    const message = {
      authenticator: data.authenticator,
      space: data.space,
      voter: address,
      proposalId: `0x${data.proposal.toString(16)}`,
      choice: `0x${data.choice.toString(16)}`,
      userVotingStrategies,
      metadataUri: shortString
        .splitLongString(data.metadataUri)
        .map(str => shortString.encodeShortString(str))
    };

    const signatureData = await this.sign(signer, message, voteTypes, 'Vote');

    return {
      signatureData,
      data
    };
  }
}
