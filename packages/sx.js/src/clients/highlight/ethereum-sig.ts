import {
  Signer,
  TypedDataDomain,
  TypedDataField,
  TypedDataSigner
} from '@ethersproject/abstract-signer';
import {
  ClaimRole,
  CloseTopic,
  CreatePost,
  CreateRole,
  CreateTopic,
  DeleteRole,
  EditRole,
  Envelope,
  HidePost,
  PinPost,
  RevokeRole,
  SetAlias,
  UnpinPost,
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

  public async createTopic({
    signer,
    data,
    salt
  }: {
    signer: Signer & TypedDataSigner;
    data: CreateTopic;
    salt: bigint;
  }): Promise<Envelope> {
    const domain = await this.getDomain(signer, salt, TOWNHALL_CONFIG.address);

    const { space, metadataUri } = data;
    const message = {
      space,
      metadataUri
    };

    const signature = await this.sign(
      signer,
      domain,
      TOWNHALL_CONFIG.types.createTopic,
      message
    );

    return {
      type: 'HIGHLIGHT_ENVELOPE',
      domain,
      message,
      primaryType: 'Topic',
      signer: await signer.getAddress(),
      signature
    };
  }

  public async closeTopic({
    signer,
    data,
    salt
  }: {
    signer: Signer & TypedDataSigner;
    data: CloseTopic;
    salt: bigint;
  }): Promise<Envelope> {
    const domain = await this.getDomain(signer, salt, TOWNHALL_CONFIG.address);

    const { space, topic } = data;
    const message = {
      space,
      topic
    };

    const signature = await this.sign(
      signer,
      domain,
      TOWNHALL_CONFIG.types.closeTopic,
      message
    );

    return {
      type: 'HIGHLIGHT_ENVELOPE',
      domain,
      message,
      primaryType: 'CloseTopic',
      signer: await signer.getAddress(),
      signature
    };
  }

  public async createPost({
    signer,
    data,
    salt
  }: {
    signer: Signer & TypedDataSigner;
    data: CreatePost;
    salt: bigint;
  }): Promise<Envelope> {
    const domain = await this.getDomain(signer, salt, TOWNHALL_CONFIG.address);

    const { space, topic, metadataUri } = data;
    const message = {
      space,
      topic,
      metadataUri
    };

    const signature = await this.sign(
      signer,
      domain,
      TOWNHALL_CONFIG.types.createPost,
      message
    );

    return {
      type: 'HIGHLIGHT_ENVELOPE',
      domain,
      message,
      primaryType: 'Post',
      signer: await signer.getAddress(),
      signature
    };
  }

  public async hidePost({
    signer,
    data,
    salt
  }: {
    signer: Signer & TypedDataSigner;
    data: HidePost;
    salt: bigint;
  }): Promise<Envelope> {
    const domain = await this.getDomain(signer, salt, TOWNHALL_CONFIG.address);

    const { space, topic, post } = data;
    const message = {
      space,
      topic,
      post
    };

    const signature = await this.sign(
      signer,
      domain,
      TOWNHALL_CONFIG.types.hidePost,
      message
    );

    return {
      type: 'HIGHLIGHT_ENVELOPE',
      domain,
      message,
      primaryType: 'HidePost',
      signer: await signer.getAddress(),
      signature
    };
  }

  public async pinPost({
    signer,
    data,
    salt
  }: {
    signer: Signer & TypedDataSigner;
    data: PinPost;
    salt: bigint;
  }): Promise<Envelope> {
    const domain = await this.getDomain(signer, salt, TOWNHALL_CONFIG.address);

    const { space, topic, post } = data;
    const message = {
      space,
      topic,
      post
    };

    const signature = await this.sign(
      signer,
      domain,
      TOWNHALL_CONFIG.types.pinPost,
      message
    );

    return {
      type: 'HIGHLIGHT_ENVELOPE',
      domain,
      message,
      primaryType: 'PinPost',
      signer: await signer.getAddress(),
      signature
    };
  }

  public async unpinPost({
    signer,
    data,
    salt
  }: {
    signer: Signer & TypedDataSigner;
    data: UnpinPost;
    salt: bigint;
  }): Promise<Envelope> {
    const domain = await this.getDomain(signer, salt, TOWNHALL_CONFIG.address);

    const { space, topic, post } = data;
    const message = {
      space,
      topic,
      post
    };

    const signature = await this.sign(
      signer,
      domain,
      TOWNHALL_CONFIG.types.unpinPost,
      message
    );

    return {
      type: 'HIGHLIGHT_ENVELOPE',
      domain,
      message,
      primaryType: 'UnpinPost',
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

    const { space, topic, post, choice } = data;
    const message = {
      space,
      topic,
      post,
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

  public async createRole({
    signer,
    data,
    salt
  }: {
    signer: Signer & TypedDataSigner;
    data: CreateRole;
    salt: bigint;
  }): Promise<Envelope> {
    const domain = await this.getDomain(signer, salt, TOWNHALL_CONFIG.address);

    const { space, metadataUri } = data;
    const message = {
      space,
      metadataUri
    };

    const signature = await this.sign(
      signer,
      domain,
      TOWNHALL_CONFIG.types.createRole,
      message
    );

    return {
      type: 'HIGHLIGHT_ENVELOPE',
      domain,
      message,
      primaryType: 'CreateRole',
      signer: await signer.getAddress(),
      signature
    };
  }

  public async editRole({
    signer,
    data,
    salt
  }: {
    signer: Signer & TypedDataSigner;
    data: EditRole;
    salt: bigint;
  }): Promise<Envelope> {
    const domain = await this.getDomain(signer, salt, TOWNHALL_CONFIG.address);

    const { space, id, metadataUri } = data;
    const message = {
      space,
      id,
      metadataUri
    };

    const signature = await this.sign(
      signer,
      domain,
      TOWNHALL_CONFIG.types.editRole,
      message
    );

    return {
      type: 'HIGHLIGHT_ENVELOPE',
      domain,
      message,
      primaryType: 'EditRole',
      signer: await signer.getAddress(),
      signature
    };
  }

  public async deleteRole({
    signer,
    data,
    salt
  }: {
    signer: Signer & TypedDataSigner;
    data: DeleteRole;
    salt: bigint;
  }): Promise<Envelope> {
    const domain = await this.getDomain(signer, salt, TOWNHALL_CONFIG.address);

    const { space, id } = data;
    const message = {
      space,
      id
    };

    const signature = await this.sign(
      signer,
      domain,
      TOWNHALL_CONFIG.types.deleteRole,
      message
    );

    return {
      type: 'HIGHLIGHT_ENVELOPE',
      domain,
      message,
      primaryType: 'DeleteRole',
      signer: await signer.getAddress(),
      signature
    };
  }

  public async claimRole({
    signer,
    data,
    salt
  }: {
    signer: Signer & TypedDataSigner;
    data: ClaimRole;
    salt: bigint;
  }): Promise<Envelope> {
    const domain = await this.getDomain(signer, salt, TOWNHALL_CONFIG.address);

    const { space, id } = data;
    const message = {
      space,
      id
    };

    const signature = await this.sign(
      signer,
      domain,
      TOWNHALL_CONFIG.types.claimRole,
      message
    );

    return {
      type: 'HIGHLIGHT_ENVELOPE',
      domain,
      message,
      primaryType: 'ClaimRole',
      signer: await signer.getAddress(),
      signature
    };
  }

  public async revokeRole({
    signer,
    data,
    salt
  }: {
    signer: Signer & TypedDataSigner;
    data: RevokeRole;
    salt: bigint;
  }): Promise<Envelope> {
    const domain = await this.getDomain(signer, salt, TOWNHALL_CONFIG.address);

    const { space, id } = data;
    const message = {
      space,
      id
    };

    const signature = await this.sign(
      signer,
      domain,
      TOWNHALL_CONFIG.types.revokeRole,
      message
    );

    return {
      type: 'HIGHLIGHT_ENVELOPE',
      domain,
      message,
      primaryType: 'RevokeRole',
      signer: await signer.getAddress(),
      signature
    };
  }
}
