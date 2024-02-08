import randomBytes from 'randombytes';
import { Account, CallData, shortString, typedData, uint256 } from 'starknet';
import { getStrategiesWithParams } from '../../../utils/strategies';
import { baseDomain, proposeTypes, updateProposalTypes, voteTypes } from './types';
import {
  ClientConfig,
  ClientOpts,
  Envelope,
  Propose,
  UpdateProposal,
  Vote,
  StarknetEIP712ProposeMessage,
  StarknetEIP712UpdateProposalMessage,
  StarknetEIP712VoteMessage,
  SignatureData
} from '../../../types';
import { defaultNetwork } from '../../..';

export class StarknetSig {
  config: ClientConfig & { manaUrl: string };

  constructor(opts: ClientOpts & { manaUrl: string }) {
    this.config = {
      networkConfig: defaultNetwork,
      ...opts
    };
  }

  generateSalt() {
    return `0x${randomBytes(4).toString('hex')}`;
  }

  public async send(envelope) {
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

    const data: typedData.TypedData = {
      types,
      primaryType,
      domain,
      message
    };

    const signature = await signer.signMessage(data);

    return {
      address: signer.address,
      signature: Array.isArray(signature)
        ? signature.map(v => `0x${BigInt(v).toString(16)}`)
        : [`0x${signature.r.toString(16)}`, `0x${signature.s.toString(16)}`],
      message,
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

  public async vote({ signer, data }: { signer: Account; data: Vote }): Promise<Envelope<Vote>> {
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
      metadataUri: shortString.splitLongString('').map(str => shortString.encodeShortString(str))
    };

    const signatureData = await this.sign(signer, data.authenticator, message, voteTypes, 'Vote');

    return {
      signatureData,
      data
    };
  }
}
