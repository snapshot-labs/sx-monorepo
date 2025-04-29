import {
  Signer,
  TypedDataDomain,
  TypedDataField,
  TypedDataSigner
} from '@ethersproject/abstract-signer';
import {
  CloseDiscussion,
  CreateDiscussion,
  CreateStatement,
  Envelope,
  HideStatement,
  PinStatement,
  SetAlias,
  UnpinStatement,
  Vote
} from './types';
import {
  ALIASES_CONFIG,
  HIGHLIGHT_DOMAIN,
  TOWNHALL_CONFIG
} from '../../highlightConstants';

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
      ...HIGHLIGHT_DOMAIN,
      chainId,
      salt: `0x${salt.toString(16).padStart(64, '0')}`,
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
    const { domain, message, primaryType, signer, signature } = envelope;

    const payload = {
      method: 'hl_postMessage',
      params: {
        domain: {
          ...domain,
          salt: domain.salt.toString()
        },
        message,
        primaryType,
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
    const domain = await this.getDomain(signer, salt, ALIASES_CONFIG.address);

    const { alias, from } = data;
    const message = {
      from,
      alias
    };

    const signature = await this.sign(
      signer,
      domain,
      ALIASES_CONFIG.types.setAlias,
      message
    );

    return {
      type: 'HIGHLIGHT_ENVELOPE',
      domain,
      message,
      primaryType: 'SetAlias',
      signer: await signer.getAddress(),
      signature
    };
  }

  public async createDiscussion({
    signer,
    data,
    salt
  }: {
    signer: Signer & TypedDataSigner;
    data: CreateDiscussion;
    salt: bigint;
  }): Promise<Envelope> {
    const domain = await this.getDomain(signer, salt, TOWNHALL_CONFIG.address);

    const { title, body, discussionUrl } = data;
    const message = {
      title,
      body,
      discussionUrl
    };

    const signature = await this.sign(
      signer,
      domain,
      TOWNHALL_CONFIG.types.createDiscussion,
      message
    );

    return {
      type: 'HIGHLIGHT_ENVELOPE',
      domain,
      message,
      primaryType: 'Discussion',
      signer: await signer.getAddress(),
      signature
    };
  }

  public async closeDiscussion({
    signer,
    data,
    salt
  }: {
    signer: Signer & TypedDataSigner;
    data: CloseDiscussion;
    salt: bigint;
  }): Promise<Envelope> {
    const domain = await this.getDomain(signer, salt, TOWNHALL_CONFIG.address);

    const { discussion } = data;
    const message = {
      discussion
    };

    const signature = await this.sign(
      signer,
      domain,
      TOWNHALL_CONFIG.types.closeDiscussion,
      message
    );

    return {
      type: 'HIGHLIGHT_ENVELOPE',
      domain,
      message,
      primaryType: 'CloseDiscussion',
      signer: await signer.getAddress(),
      signature
    };
  }

  public async createStatement({
    signer,
    data,
    salt
  }: {
    signer: Signer & TypedDataSigner;
    data: CreateStatement;
    salt: bigint;
  }): Promise<Envelope> {
    const domain = await this.getDomain(signer, salt, TOWNHALL_CONFIG.address);

    const { discussion, statement } = data;
    const message = {
      discussion,
      statement
    };

    const signature = await this.sign(
      signer,
      domain,
      TOWNHALL_CONFIG.types.createStatement,
      message
    );

    return {
      type: 'HIGHLIGHT_ENVELOPE',
      domain,
      message,
      primaryType: 'Statement',
      signer: await signer.getAddress(),
      signature
    };
  }

  public async hideStatement({
    signer,
    data,
    salt
  }: {
    signer: Signer & TypedDataSigner;
    data: HideStatement;
    salt: bigint;
  }): Promise<Envelope> {
    const domain = await this.getDomain(signer, salt, TOWNHALL_CONFIG.address);

    const { discussion, statement } = data;
    const message = {
      discussion,
      statement
    };

    const signature = await this.sign(
      signer,
      domain,
      TOWNHALL_CONFIG.types.hideStatement,
      message
    );

    return {
      type: 'HIGHLIGHT_ENVELOPE',
      domain,
      message,
      primaryType: 'HideStatement',
      signer: await signer.getAddress(),
      signature
    };
  }

  public async pinStatement({
    signer,
    data,
    salt
  }: {
    signer: Signer & TypedDataSigner;
    data: PinStatement;
    salt: bigint;
  }): Promise<Envelope> {
    const domain = await this.getDomain(signer, salt, TOWNHALL_CONFIG.address);

    const { discussion, statement } = data;
    const message = {
      discussion,
      statement
    };

    const signature = await this.sign(
      signer,
      domain,
      TOWNHALL_CONFIG.types.pinStatement,
      message
    );

    return {
      type: 'HIGHLIGHT_ENVELOPE',
      domain,
      message,
      primaryType: 'PinStatement',
      signer: await signer.getAddress(),
      signature
    };
  }

  public async unpinStatement({
    signer,
    data,
    salt
  }: {
    signer: Signer & TypedDataSigner;
    data: UnpinStatement;
    salt: bigint;
  }): Promise<Envelope> {
    const domain = await this.getDomain(signer, salt, TOWNHALL_CONFIG.address);

    const { discussion, statement } = data;
    const message = {
      discussion,
      statement
    };

    const signature = await this.sign(
      signer,
      domain,
      TOWNHALL_CONFIG.types.unpinStatement,
      message
    );

    return {
      type: 'HIGHLIGHT_ENVELOPE',
      domain,
      message,
      primaryType: 'UnpinStatement',
      signer: await signer.getAddress(),
      signature
    };
  }

  public async vote({
    signer,
    data,
    salt
  }: {
    signer: Signer & TypedDataSigner;
    data: Vote;
    salt: bigint;
  }): Promise<Envelope> {
    const domain = await this.getDomain(signer, salt, TOWNHALL_CONFIG.address);

    const { discussion, statement, choice } = data;
    const message = {
      discussion,
      statement,
      choice
    };

    const signature = await this.sign(
      signer,
      domain,
      TOWNHALL_CONFIG.types.vote,
      message
    );

    return {
      type: 'HIGHLIGHT_ENVELOPE',
      domain,
      message,
      primaryType: 'Vote',
      signer: await signer.getAddress(),
      signature
    };
  }
}
