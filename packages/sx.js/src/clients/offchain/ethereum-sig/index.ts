import { offchainGoerli } from '../../../offchainNetworks';
import { domain, voteTypes } from './types';
import type { Signer, TypedDataSigner, TypedDataField } from '@ethersproject/abstract-signer';
import type { Vote, Envelope, SignatureData, EIP712VoteMessage, EIP712Message } from '../types';
import type { OffchainNetworkConfig } from '../../../types';

const SEQUENCER_URLS = {
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

  public async sign<T extends EIP712VoteMessage>(
    signer: Signer & TypedDataSigner,
    message: T,
    types: Record<string, TypedDataField[]>
  ): Promise<SignatureData> {
    const address = await signer.getAddress();
    const EIP712Message: EIP712Message = {
      ...message,
      from: address,
      timestamp: parseInt((Date.now() / 1e3).toFixed())
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

  public async send(envelope: Envelope<Vote>) {
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

    return await res.json();
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

    const signatureData = await this.sign(signer, message, voteTypes);

    return {
      signatureData,
      data
    };
  }
}
