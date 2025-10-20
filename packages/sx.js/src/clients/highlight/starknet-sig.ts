import { Account, StarknetDomain, StarknetType, TypedData } from 'starknet';
import { Envelope, HighlightDomain, SetAlias } from './types';
import {
  HIGHLIGHT_STARKNET_DOMAIN,
  STARKNET_ALIASES_CONFIG
} from '../../highlightConstants';

export class HighlightStarknetSigClient {
  private highlightUrl: string;

  constructor(highlightUrl: string) {
    this.highlightUrl = highlightUrl;
  }

  public async getDomain(
    signer: Account,
    salt: bigint,
    to: string
  ): Promise<{
    starknetDomain: Required<StarknetDomain>;
    meta: Pick<HighlightDomain, 'salt' | 'verifyingContract'>;
  }> {
    return {
      starknetDomain: {
        ...HIGHLIGHT_STARKNET_DOMAIN,
        chainId: await signer.getChainId()
      },
      meta: {
        salt: `0x${salt.toString(16).padStart(64, '0')}`,
        verifyingContract: to
      }
    };
  }

  public async sign(
    signer: Account,
    domain: Required<StarknetDomain>,
    primaryType: string,
    types: Record<string, StarknetType[]>,
    message: Record<string, any>
  ): Promise<string> {
    const data: TypedData = {
      types,
      primaryType,
      domain,
      message
    };

    const signature = await signer.signMessage(data);

    return (
      Array.isArray(signature)
        ? signature.map(v => `0x${BigInt(v).toString(16)}`)
        : [`0x${signature.r.toString(16)}`, `0x${signature.s.toString(16)}`]
    ).join(',');
  }

  public async send(envelope: Envelope): Promise<any> {
    const { domain, message, primaryType, signer, signature } = envelope;

    const payload = {
      method: 'hl_postMessage',
      params: {
        domain,
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
    signer: Account;
    data: SetAlias;
    salt: bigint;
  }): Promise<Envelope> {
    const primaryType = 'SetAlias';

    const domain = await this.getDomain(
      signer,
      salt,
      STARKNET_ALIASES_CONFIG.address
    );

    const signature = await this.sign(
      signer,
      domain.starknetDomain,
      primaryType,
      STARKNET_ALIASES_CONFIG.types.setAlias,
      data
    );

    return {
      type: 'HIGHLIGHT_ENVELOPE',
      domain: { ...domain.starknetDomain, ...domain.meta },
      message: data,
      primaryType,
      signer: signer.address,
      signature
    };
  }
}
