import {
  Signer,
  TypedDataDomain,
  TypedDataField,
  TypedDataSigner
} from '@ethersproject/abstract-signer';
import { aliasTypes, domain as baseDomain, Envelope, SetAlias } from './types';

const ALIASES_ADDRESS = '0x0000000000000000000000000000000000000001';
export class HighlightEthereumSigClient {
  private highlightUrl: string;

  constructor(highlightUrl: string) {
    this.highlightUrl = highlightUrl;
  }

  public async getDomain(
    signer: Signer & TypedDataSigner,
    salt: bigint,
    to: string
  ): Promise<Required<TypedDataDomain>> {
    const chainId = await signer.getChainId();

    const domain = {
      ...baseDomain,
      chainId,
      salt: `0x${salt.toString(16)}`,
      verifyingContract: to
    };

    return domain;
  }

  public async sign(
    signer: Signer & TypedDataSigner,
    domain: Required<TypedDataDomain>,
    types: Record<string, TypedDataField[]>,
    message: Record<string, any>
  ) {
    return signer._signTypedData(domain, types, message);
  }

  public async send(envelope: Envelope) {
    const { domain, message, entrypoint, signer, signature } = envelope;

    const payload = {
      method: 'hl_postMessage',
      params: {
        domain: {
          ...domain,
          salt: domain.salt.toString()
        },
        message,
        entrypoint,
        signer,
        signature
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
    data,
    salt
  }: {
    signer: Signer & TypedDataSigner;
    data: SetAlias;
    salt: bigint;
  }): Promise<Envelope> {
    const domain = await this.getDomain(signer, salt, ALIASES_ADDRESS);

    const { alias, from } = data;
    const message = {
      from,
      alias
    };

    const signature = await this.sign(signer, domain, aliasTypes, message);

    return {
      type: 'HIGHLIGHT_ENVELOPE',
      domain,
      message,
      entrypoint: 'setAlias',
      signer: await signer.getAddress(),
      signature
    };
  }
}
