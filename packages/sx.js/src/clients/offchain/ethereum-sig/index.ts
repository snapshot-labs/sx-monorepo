import { offchainGoerli } from '../../../offchainNetworks';
import {
  domain,
  proposeTypes,
  basicVoteTypes,
  singleChoiceVoteTypes,
  approvalVoteTypes,
  rankedChoiceVoteTypes,
  updateProposalTypes,
  cancelProposalTypes
} from './types';
import type { Signer, TypedDataSigner, TypedDataField } from '@ethersproject/abstract-signer';
import type {
  SignatureData,
  Envelope,
  Vote,
  Propose,
  UpdateProposal,
  CancelProposal,
  EIP712Message,
  EIP712VoteMessage,
  EIP712ProposeMessage,
  EIP712UpdateProposal,
  EIP712CancelProposalMessage
} from '../types';
import type { OffchainNetworkConfig } from '../../../types';

const SEQUENCER_URLS: Record<OffchainNetworkConfig['eip712ChainId'], string> = {
  1: 'https://seq.snapshot.org',
  5: 'https://testnet.seq.snapshot.org'
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
    this.sequencerUrl = opts?.sequencerUrl || SEQUENCER_URLS[this.networkConfig.eip712ChainId];
  }

  public async sign<
    T extends
      | EIP712VoteMessage
      | EIP712ProposeMessage
      | EIP712UpdateProposal
      | EIP712CancelProposalMessage
  >(
    signer: Signer & TypedDataSigner,
    message: T,
    types: Record<string, TypedDataField[]>
  ): Promise<SignatureData> {
    const address = await signer.getAddress();
    const EIP712Message: EIP712Message = {
      from: address,
      timestamp: parseInt((Date.now() / 1e3).toFixed()),
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

  public async send(envelope: Envelope<Vote | Propose | UpdateProposal | CancelProposal>) {
    const { address, signature: sig, domain, types, message } = envelope.signatureData!;
    const payload = {
      address,
      sig,
      data: {
        domain,
        types,
        message
      }
    };

    const body = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    };

    const res = await fetch(this.sequencerUrl, body);
    const result = await res.json();

    if (result.error) {
      throw new Error(
        typeof result.error_description === 'string' ? result.error_description : result.error
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
    const message = {
      space: data.space,
      proposal: data.proposal.toString(),
      choice: data.choice,
      reason: '',
      app: '',
      metadata: ''
    };

    let voteType = basicVoteTypes;
    if (data.type === 'single-choice') voteType = singleChoiceVoteTypes;
    if (data.type === 'approval') voteType = approvalVoteTypes;
    if (data.type === 'ranked-choice') voteType = rankedChoiceVoteTypes;

    const signatureData = await this.sign(signer, message, voteType);

    return {
      signatureData,
      data
    };
  }
}
