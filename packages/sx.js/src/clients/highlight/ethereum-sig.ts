import {
  Signer,
  TypedDataField,
  TypedDataSigner
} from '@ethersproject/abstract-signer';
import { ALIASES_ADDRESS, encodeSetAlias } from './abis';
import { aliasTypes, domain as baseDomain, Envelope, SetAlias } from './types';

export class HighlightEthereumSigClient {
  private highlightUrl: string;

  constructor(highlightUrl: string) {
    this.highlightUrl = highlightUrl;
  }

  public async sign(
    signer: Signer & TypedDataSigner,
    types: Record<string, TypedDataField[]>,
    message: Record<string, any>
  ) {
    return signer._signTypedData(baseDomain, types, message);
  }

  public async send(envelope: Envelope) {
    const { from, to, data } = envelope;

    const payload = {
      method: 'hl_postJoint',
      params: {
        from,
        to,
        data
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

    const res = await fetch(this.highlightUrl, body);

    if (!res.ok) {
      throw new Error(`Failed to send envelope: ${res.statusText}`);
    }

    const result = await res.json();

    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  }

  public async setAlias({
    signer,
    data
  }: {
    signer: Signer & TypedDataSigner;
    data: SetAlias;
  }): Promise<Envelope> {
    const signature = await this.sign(signer, aliasTypes, data);

    return {
      type: 'HIGHLIGHT_ENVELOPE',
      from: data.from,
      to: ALIASES_ADDRESS,
      data: encodeSetAlias(data.from, data.alias, data.salt, signature)
    };
  }
}
