import {
  Signer,
  TypedDataField,
  TypedDataSigner
} from '@ethersproject/abstract-signer';
import { Contract } from '@ethersproject/contracts';
import GovernorAbi from './abis/Governor.json';
import { ballotTypes, ballotWithReasonTypes } from './types';
import { GovernorBravoAuthenticator } from '../../../types';
import { EIP712Ballot, Envelope, SignatureData, Vote } from '../types';

const CUSTOM_NAMES: Record<string, string | undefined> = {
  // This is our Sepolia test deployment
  // Looks like I deployed some weird version that doesn't have name function
  '0x69112D158A607DD388034c0C09242FF966985258': 'Compound Governor Bravo'
};

export class EthereumSig {
  chainId: number;

  constructor({ chainId }: { chainId: number }) {
    this.chainId = chainId;
  }

  public async sign<T extends EIP712Ballot>(
    signer: Signer & TypedDataSigner,
    authenticatorType: GovernorBravoAuthenticator,
    verifyingContract: string,
    message: T,
    types: Record<string, TypedDataField[]>
  ): Promise<SignatureData> {
    const address = await signer.getAddress();

    const govenorContract = new Contract(
      verifyingContract,
      GovernorAbi,
      signer
    );

    const name =
      CUSTOM_NAMES[verifyingContract] ?? (await govenorContract.name());

    const domain = {
      name,
      chainId: this.chainId,
      verifyingContract
    };

    const signature = await signer._signTypedData(domain, types, message);

    return {
      authenticatorType,
      address,
      signature,
      domain,
      types,
      message
    };
  }

  async vote({
    signer,
    authenticatorType,
    data
  }: {
    signer: Signer & TypedDataSigner;
    authenticatorType: GovernorBravoAuthenticator;
    data: Vote;
  }): Promise<Envelope<Vote>> {
    const { spaceId, proposalId, choice: support, reason } = data;

    let message;
    if (reason) {
      message = {
        proposalId,
        support,
        reason
      };
    } else {
      message = {
        proposalId,
        support
      };
    }

    const signatureData = await this.sign(
      signer,
      authenticatorType,
      spaceId,
      message,
      reason ? ballotWithReasonTypes : ballotTypes
    );

    return {
      data,
      signatureData
    };
  }
}
