import randomBytes from 'randombytes';
import { Signer, TypedDataSigner, TypedDataField } from '@ethersproject/abstract-signer';
import { CallData, shortString } from 'starknet';
import { getStrategiesParams } from '../../../utils/strategies';
import { proposeTypes, updateProposalTypes, voteTypes } from './types';
import {
  ClientConfig,
  ClientOpts,
  Envelope,
  Propose,
  UpdateProposal,
  Vote,
  EIP712ProposeMessage,
  EIP712UpdateProposalMessage,
  EIP712VoteMessage,
  SignatureData
} from '../../../types';
import { defaultNetwork } from '../../..';
import { getRSVFromSig } from '../../../utils/encoding';

export class EthereumSig {
  config: ClientConfig;

  constructor(opts: ClientOpts) {
    this.config = {
      networkConfig: defaultNetwork,
      ...opts
    };
  }

  generateSalt() {
    return `0x${randomBytes(4).toString('hex')}`;
  }

  public async sign<
    T extends EIP712ProposeMessage | EIP712UpdateProposalMessage | EIP712VoteMessage
  >(
    signer: Signer & TypedDataSigner,
    message: T,
    types: Record<string, TypedDataField[]>
  ): Promise<SignatureData> {
    const address = await signer.getAddress();

    const domain = {
      chainId: this.config.networkConfig.eip712ChainId
    };

    const signature = await signer._signTypedData(domain, types, message);
    const { r, s, v } = getRSVFromSig(signature);

    return {
      address,
      signature: [r.toHex(), s.toHex(), v],
      message
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

    const strategiesParams = await getStrategiesParams(
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
        user_strategies: data.strategies.map((strategyConfig, i) => ({
          index: strategyConfig.index,
          params: strategiesParams[i]
        }))
      }),
      metadataURI: shortString
        .splitLongString(data.metadataUri)
        .map(str => shortString.encodeShortString(str)),
      salt: this.generateSalt()
    };

    const signatureData = await this.sign(signer, message, proposeTypes);

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
      metadataURI: shortString
        .splitLongString(data.metadataUri)
        .map(str => shortString.encodeShortString(str)),
      salt: this.generateSalt()
    };

    const signatureData = await this.sign(signer, message, updateProposalTypes);

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

    const strategiesParams = await getStrategiesParams(
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
      userVotingStrategies: data.strategies.map((strategy, index) => ({
        index: strategy.index,
        params: strategiesParams[index]
      })),
      metadataURI: shortString.splitLongString('').map(str => shortString.encodeShortString(str))
    };

    const signatureData = await this.sign(signer, message, voteTypes);

    return {
      signatureData,
      data
    };
  }
}
