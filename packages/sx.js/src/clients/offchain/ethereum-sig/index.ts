import {
  Signer,
  TypedDataField,
  TypedDataSigner
} from '@ethersproject/abstract-signer';
import {
  aliasTypes,
  approvalVoteTypes,
  basicVoteTypes,
  cancelProposalTypes,
  deleteSpaceTypes,
  domain,
  encryptedVoteTypes,
  followSpaceTypes,
  proposeTypes,
  rankedChoiceVoteTypes,
  singleChoiceVoteTypes,
  unfollowSpaceTypes,
  updateProposalTypes,
  updateSpaceTypes,
  updateStatementTypes,
  updateUserTypes,
  weightedVoteTypes
} from './types';
import { offchainGoerli } from '../../../offchainNetworks';
import { OffchainNetworkConfig, SignatureData } from '../../../types';
import {
  CancelProposal,
  DeleteSpace,
  EIP712CancelProposalMessage,
  EIP712DeleteSpaceMessage,
  EIP712FollowSpaceMessage,
  EIP712Message,
  EIP712ProposeMessage,
  EIP712SetAliasMessage,
  EIP712UnfollowSpaceMessage,
  EIP712UpdateProposal,
  EIP712UpdateSpaceMessage,
  EIP712UpdateStatementMessage,
  EIP712UpdateUserMessage,
  EIP712VoteMessage,
  Envelope,
  FollowSpace,
  Propose,
  SetAlias,
  UnfollowSpace,
  UpdateProposal,
  UpdateSpace,
  UpdateStatement,
  UpdateUser,
  Vote
} from '../types';
import { encryptChoices } from '../utils';

const SEQUENCER_URLS: Record<OffchainNetworkConfig['eip712ChainId'], string> = {
  1: 'https://seq.snapshot.org',
  5: 'https://testnet.seq.snapshot.org'
};

const RELAYER_URLS: Record<OffchainNetworkConfig['eip712ChainId'], string> = {
  1: 'https://relayer.snapshot.org',
  5: 'https://testnet.seq.snapshot.org' // no relayer for testnet
};

type EthereumSigClientOpts = {
  networkConfig?: OffchainNetworkConfig;
  sequencerUrl?: string;
};

export class EthereumSig {
  sequencerUrl: string;
  networkConfig: OffchainNetworkConfig;

  constructor(opts?: EthereumSigClientOpts) {
    this.networkConfig = opts?.networkConfig || offchainGoerli;
    this.sequencerUrl =
      opts?.sequencerUrl || SEQUENCER_URLS[this.networkConfig.eip712ChainId];
  }

  public async sign<
    T extends
      | EIP712VoteMessage
      | EIP712ProposeMessage
      | EIP712UpdateProposal
      | EIP712CancelProposalMessage
      | EIP712FollowSpaceMessage
      | EIP712UnfollowSpaceMessage
      | EIP712SetAliasMessage
      | EIP712UpdateUserMessage
      | EIP712UpdateStatementMessage
      | EIP712UpdateSpaceMessage
      | EIP712DeleteSpaceMessage
  >(
    signer: Signer & TypedDataSigner,
    message: T,
    types: Record<string, TypedDataField[]>
  ): Promise<SignatureData> {
    const address = await signer.getAddress();
    const EIP712Message: EIP712Message = {
      from: address,
      timestamp: parseInt((Date.now() / 1000).toFixed()),
      ...message
    };
    const signature = await signer._signTypedData(domain, types, EIP712Message);
    return {
      address,
      signature,
      domain,
      types,
      message: EIP712Message
    };
  }

  public async send(
    envelope: Envelope<
      | Vote
      | Propose
      | UpdateProposal
      | CancelProposal
      | FollowSpace
      | UnfollowSpace
      | SetAlias
    >
  ) {
    const {
      address,
      signature: sig,
      domain,
      types,
      primaryType,
      message
    } = envelope.signatureData!;
    const payload: any = {
      address,
      sig,
      data: {
        domain,
        types,
        message
      }
    };

    // primaryType needs to be attached when sending starknet-sig generated payload
    if (primaryType) payload.data.primaryType = primaryType;

    const body = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    };

    let url = this.sequencerUrl;
    if (sig === '0x') {
      url = RELAYER_URLS[this.networkConfig.eip712ChainId] || url;
    }
    const res = await fetch(url, body);
    const result = await res.json();

    if (result.error) {
      throw new Error(
        typeof result.error_description === 'string'
          ? result.error_description
          : result.error
      );
    }

    return result;
  }

  public async propose({
    signer,
    data
  }: {
    signer: Signer & TypedDataSigner;
    data: Propose;
  }): Promise<Envelope<Propose>> {
    const signatureData = await this.sign(signer, data, proposeTypes);

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
    const signatureData = await this.sign(signer, data, updateProposalTypes);

    return {
      signatureData,
      data
    };
  }

  public async cancel({
    signer,
    data
  }: {
    signer: Signer & TypedDataSigner;
    data: CancelProposal;
  }): Promise<Envelope<CancelProposal>> {
    const signatureData = await this.sign(signer, data, cancelProposalTypes);

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
    let choice: EIP712VoteMessage['choice'];
    let voteType: { Vote: { name: string; type: string }[] };

    switch (data.type) {
      case 'single-choice':
        voteType = singleChoiceVoteTypes;
        choice = data.choice as number;
        break;
      case 'approval':
        voteType = approvalVoteTypes;
        choice = data.choice as number[];
        break;
      case 'ranked-choice':
        voteType = rankedChoiceVoteTypes;
        choice = data.choice as number[];
        break;
      case 'weighted':
      case 'quadratic':
        voteType = weightedVoteTypes;
        choice = JSON.stringify(data.choice);
        break;
      default:
        voteType = basicVoteTypes;
        choice = data.choice as number;
    }

    const message: EIP712VoteMessage = {
      space: data.space,
      proposal: data.proposal,
      choice,
      reason: data.reason || '',
      app: data.app,
      metadata: ''
    };

    if (data.privacy) {
      message.privacy = data.privacy;
      voteType = encryptedVoteTypes;
      message.choice = await encryptChoices(
        data.privacy,
        data.proposal,
        typeof message.choice === 'string'
          ? message.choice
          : JSON.stringify(message.choice)
      );
    }
    const signatureData = await this.sign(signer, message, voteType);

    return {
      signatureData,
      data
    };
  }

  public async followSpace({
    signer,
    data
  }: {
    signer: Signer & TypedDataSigner;
    data: FollowSpace;
  }): Promise<Envelope<FollowSpace>> {
    const signatureData = await this.sign(signer, data, followSpaceTypes);

    return {
      signatureData,
      data
    };
  }

  public async unfollowSpace({
    signer,
    data
  }: {
    signer: Signer & TypedDataSigner;
    data: UnfollowSpace;
  }): Promise<Envelope<UnfollowSpace>> {
    const signatureData = await this.sign(signer, data, unfollowSpaceTypes);

    return {
      signatureData,
      data
    };
  }

  public async setAlias({
    signer,
    data
  }: {
    signer: Signer & TypedDataSigner;
    data: SetAlias;
  }): Promise<Envelope<SetAlias>> {
    const signatureData = await this.sign(signer, data, aliasTypes);

    return {
      signatureData,
      data
    };
  }

  public async updateUser({
    signer,
    data
  }: {
    signer: Signer & TypedDataSigner;
    data: UpdateUser;
  }) {
    const signatureData = await this.sign(signer, data, updateUserTypes);

    return {
      signatureData,
      data
    };
  }

  public async updateStatement({
    signer,
    data
  }: {
    signer: Signer & TypedDataSigner;
    data: UpdateStatement;
  }) {
    const signatureData = await this.sign(signer, data, updateStatementTypes);

    return {
      signatureData,
      data
    };
  }

  public async updateSpace({
    signer,
    data
  }: {
    signer: Signer & TypedDataSigner;
    data: UpdateSpace;
  }) {
    const signatureData = await this.sign(signer, data, updateSpaceTypes);

    return {
      signatureData,
      data
    };
  }

  public async deleteSpace({
    signer,
    data
  }: {
    signer: Signer & TypedDataSigner;
    data: DeleteSpace;
  }) {
    const signatureData = await this.sign(signer, data, deleteSpaceTypes);

    return {
      signatureData,
      data
    };
  }
}
