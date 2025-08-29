import randomBytes from 'randombytes';
import {
  Account,
  CallData,
  shortString,
  TypedData,
  uint256,
  validateAndParseAddress
} from 'starknet';
import {
  aliasTypes,
  baseDomain,
  proposeTypes,
  updateProposalTypes,
  voteTypes
} from './types';
import { getStrategiesWithParams } from '../../../utils/strategies';
import {
  Alias,
  ClientConfig,
  ClientOpts,
  Envelope,
  Propose,
  SignatureData,
  StarknetEIP712AliasMessage,
  StarknetEIP712ProposeMessage,
  StarknetEIP712UpdateProposalMessage,
  StarknetEIP712VoteMessage,
  UpdateProposal,
  Vote
} from '../types';

export class StarknetSig {
  config: ClientConfig & { manaUrl: string };

  constructor(opts: ClientOpts & { manaUrl: string }) {
    this.config = opts;
  }

  generateSalt() {
    return `0x${randomBytes(4).toString('hex')}`;
  }

  public async send(envelope: Envelope<Propose | UpdateProposal | Vote>) {
    const body = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'send',
        params: { envelope },
        id: null
      })
    };

    const res = await fetch(
      `${this.config.manaUrl}/stark_rpc/${this.config.networkConfig.eip712ChainId}`,
      body
    );
    const json = await res.json();

    return json.result;
  }

  public async sign<
    T extends
      | StarknetEIP712ProposeMessage
      | StarknetEIP712UpdateProposalMessage
      | StarknetEIP712VoteMessage
      | StarknetEIP712AliasMessage
  >(
    signer: Account,
    verifyingContract: string,
    message: T,
    types: any,
    primaryType: string
  ): Promise<SignatureData> {
    const domain = {
      ...baseDomain,
      chainId: this.config.networkConfig.eip712ChainId,
      verifyingContract
    };

    const data: TypedData = {
      types,
      primaryType,
      domain,
      message
    };
    const signature = await signer.signMessage(data);

    return {
      address: validateAndParseAddress(signer.address),
      signature: Array.isArray(signature)
        ? signature.map(v => `0x${BigInt(v).toString(16)}`)
        : [`0x${signature.r.toString(16)}`, `0x${signature.s.toString(16)}`],
      message,
      domain,
      types,
      primaryType
    };
  }

  public async propose({
    signer,
    data
  }: {
    signer: Account;
    data: Propose;
  }): Promise<Envelope<Propose>> {
    const address = signer.address;

    const userStrategies = await getStrategiesWithParams(
      'propose',
      data.strategies,
      address,
      data,
      this.config
    );

    const message = {
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
      data.authenticator,
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
    signer: Account;
    data: UpdateProposal;
  }): Promise<Envelope<UpdateProposal>> {
    const address = signer.address;

    const message = {
      space: data.space,
      author: address,
      proposalId: uint256.bnToUint256(data.proposal),
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
      data.authenticator,
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
    signer: Account;
    data: Vote;
  }): Promise<Envelope<Vote>> {
    const address = signer.address;

    const userVotingStrategies = await getStrategiesWithParams(
      'vote',
      data.strategies,
      address,
      data,
      this.config
    );

    const message = {
      space: data.space,
      voter: address,
      proposalId: uint256.bnToUint256(data.proposal),
      choice: `0x${data.choice.toString(16)}`,
      userVotingStrategies,
      metadataUri: shortString
        .splitLongString(data.metadataUri)
        .map(str => shortString.encodeShortString(str))
    };

    const signatureData = await this.sign(
      signer,
      data.authenticator,
      message,
      voteTypes,
      'Vote'
    );

    return {
      signatureData,
      data
    };
  }

  public async setAlias({
    signer,
    data
  }: {
    signer: Account;
    data: Alias;
  }): Promise<Envelope<Alias>> {
    const message = {
      from: validateAndParseAddress(signer.address),
      timestamp: parseInt((Date.now() / 1000).toFixed()),
      ...data
    };

    const signatureData = await this.sign(
      signer,
      '',
      message,
      aliasTypes,
      'SetAlias'
    );

    return {
      signatureData,
      data
    };
  }
}
