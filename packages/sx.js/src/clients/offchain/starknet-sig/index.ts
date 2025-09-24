import { Account, TypedData, validateAndParseAddress } from 'starknet';
import { aliasTypes, baseDomain } from './types';
import { OffchainNetworkStarknetConfig } from '../../../types';
import {
  EIP712SetAliasMessage,
  Envelope,
  SetAlias,
  SignatureData
} from '../types';

type StarknetSigClientOpts = {
  networkConfig: OffchainNetworkStarknetConfig;
};

export class StarknetSig {
  config: StarknetSigClientOpts;

  constructor(opts: StarknetSigClientOpts) {
    this.config = opts;
  }

  public async sign<T extends EIP712SetAliasMessage>(
    signer: Account,
    message: T,
    types: any,
    primaryType: string
  ): Promise<SignatureData> {
    const domain = {
      ...baseDomain,
      chainId: this.config.networkConfig.eip712ChainId
    };

    const data: TypedData = {
      types,
      primaryType,
      domain,
      message
    };
    const signature = await signer.signMessage(data);

    return {
      address: validateAndParseAddress(signer.address),
      signature: Array.isArray(signature)
        ? signature.map(v => `0x${BigInt(v).toString(16)}`)
        : [`0x${signature.r.toString(16)}`, `0x${signature.s.toString(16)}`],
      message,
      domain,
      types,
      primaryType
    };
  }

  public async setAlias({
    signer,
    data
  }: {
    signer: Account;
    data: SetAlias;
  }): Promise<Envelope<SetAlias>> {
    const message = {
      ...data,
      from: validateAndParseAddress(signer.address),
      timestamp: parseInt((Date.now() / 1000).toFixed())
    };

    const signatureData = await this.sign(
      signer,
      message,
      aliasTypes,
      'SetAlias'
    );

    return {
      signatureData,
      data
    };
  }
}
