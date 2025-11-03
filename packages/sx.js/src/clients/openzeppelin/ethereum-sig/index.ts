import {
  Signer,
  TypedDataField,
  TypedDataSigner
} from '@ethersproject/abstract-signer';
import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import GovernorV4Abi from './abis/GovernorV4.json';
import GovernorV5Abi from './abis/GovernorV5.json';
import { ballotTypesV5, extendedBallotTypesV5 } from './types';
import { OpenZeppelinAuthenticator } from '../../../types';
import {
  EIP712BallotV4,
  EIP712BallotV5,
  EIP712ExtendedBallotV5,
  Envelope,
  SignatureData,
  Vote
} from '../types';

export class EthereumSig {
  chainId: number;

  constructor({ chainId }: { chainId: number }) {
    this.chainId = chainId;
  }

  public async sign<
    T extends EIP712BallotV4 | EIP712BallotV5 | EIP712ExtendedBallotV5
  >(
    signer: Signer & TypedDataSigner,
    authenticatorType: OpenZeppelinAuthenticator,
    verifyingContract: string,
    message: T,
    types: Record<string, TypedDataField[]>
  ): Promise<SignatureData> {
    const address = await signer.getAddress();

    const govenorContract = new Contract(
      verifyingContract,
      GovernorV4Abi,
      signer
    );

    const [name, version]: [string, string] = await Promise.all([
      govenorContract.name(),
      govenorContract.version()
    ]);

    const domain = {
      name,
      version,
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
    authenticatorType: OpenZeppelinAuthenticator;
    data: Vote;
  }): Promise<Envelope<Vote>> {
    const voter = await signer.getAddress();
    const { spaceId, proposalId, choice: support, reason } = data;

    let message: EIP712BallotV4 | EIP712BallotV5 | EIP712ExtendedBallotV5;

    if (authenticatorType === 'OpenZeppelinAuthenticatorSignatureV5') {
      const govenorContract = new Contract(spaceId, GovernorV5Abi, signer);
      const nonce: BigNumber = await govenorContract.nonces(voter);

      if (reason) {
        message = {
          voter,
          proposalId,
          support,
          nonce: nonce.toNumber(),
          reason,
          params: '0x'
        };
      } else {
        message = {
          voter,
          proposalId,
          support,
          nonce: nonce.toNumber()
        };
      }
    } else if (authenticatorType === 'OpenZeppelinAuthenticatorSignatureV4') {
      message = {
        proposalId,
        support
      };
    } else {
      throw new Error('Unsupported authenticator type');
    }

    const signatureData = await this.sign(
      signer,
      authenticatorType,
      spaceId,
      message,
      reason ? extendedBallotTypesV5 : ballotTypesV5
    );

    return {
      data,
      signatureData
    };
  }
}
