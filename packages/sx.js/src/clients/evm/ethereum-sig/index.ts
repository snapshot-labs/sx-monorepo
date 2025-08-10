import { AbiCoder } from '@ethersproject/abi';
import {
  Signer,
  TypedDataField,
  TypedDataSigner
} from '@ethersproject/abstract-signer';
import randomBytes from 'randombytes';
import {
  domain as baseDomain,
  proposeTypes,
  updateProposalTypes,
  voteTypes
} from './types';
import { getStrategiesWithParams } from '../../../strategies/evm';
import { bytesToHex } from '../../../utils/bytes';
import { SplitUint256 } from '../../../utils/split-uint256';
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
  config: ClientConfig & { manaUrl: string };

  constructor(opts: ClientOpts & { manaUrl: string }) {
    this.config = opts;
  }

  generateSalt() {
    return Number(SplitUint256.fromHex(bytesToHex(randomBytes(4))).toHex());
  }

  public async sign<
    T extends
      | EIP712ProposeMessage
      | EIP712UpdateProposalMessage
      | EIP712VoteMessage
  >(
    signer: Signer & TypedDataSigner,
    verifyingContract: string,
    message: T,
    types: Record<string, TypedDataField[]>
  ): Promise<SignatureData> {
    const address = await signer.getAddress();

    const domain = {
      ...baseDomain,
      chainId: this.config.networkConfig.eip712ChainId,
      verifyingContract
    };

    const signature = await signer._signTypedData(domain, types, message);

    return {
      address,
      signature,
      domain,
      types,
      message
    };
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
      `${this.config.manaUrl}/eth_rpc/${this.config.networkConfig.eip712ChainId}`,
      body
    );
    const json = await res.json();

    return json.result;
  }

  public async propose({
    signer,
    data
  }: {
    signer: Signer & TypedDataSigner;
    data: Propose;
  }): Promise<Envelope<Propose>> {
    const author = await signer.getAddress();

    const userStrategies = await getStrategiesWithParams(
      'propose',
      data.strategies,
      author,
      data,
      this.config
    );

    const abiCoder = new AbiCoder();
    const message: EIP712ProposeMessage = {
      space: data.space,
      author,
      metadataURI: data.metadataUri,
      executionStrategy: data.executionStrategy,
      userProposalValidationParams: abiCoder.encode(
        ['tuple(int8 index, bytes params)[]'],
        [userStrategies]
      ),
      salt: this.generateSalt()
    };

    const signatureData = await this.sign(
      signer,
      data.authenticator,
      message,
      proposeTypes
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
    const author = await signer.getAddress();

    const message: EIP712UpdateProposalMessage = {
      space: data.space,
      author,
      proposalId: data.proposal,
      executionStrategy: data.executionStrategy,
      metadataURI: data.metadataUri,
      salt: this.generateSalt()
    };

    const signatureData = await this.sign(
      signer,
      data.authenticator,
      message,
      updateProposalTypes
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
    const voter = await signer.getAddress();

    const userVotingStrategies = await getStrategiesWithParams(
      'vote',
      data.strategies,
      voter,
      data,
      this.config
    );

    const message: EIP712VoteMessage = {
      space: data.space,
      voter,
      proposalId: data.proposal,
      choice: data.choice,
      userVotingStrategies,
      voteMetadataURI: data.metadataUri
    };

    const signatureData = await this.sign(
      signer,
      data.authenticator,
      message,
      voteTypes
    );

    return {
      signatureData,
      data
    };
  }
}
