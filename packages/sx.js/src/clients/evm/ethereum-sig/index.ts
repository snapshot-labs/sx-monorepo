import randomBytes from 'randombytes';
import { SplitUint256 } from '../../../utils/split-uint256';
import { bytesToHex } from '../../../utils/bytes';
import { domain as baseDomain, proposeTypes, voteTypes } from './types';
import type { SignatureData, EIP712ProposeMessage, Envelope, EIP712VoteMessage } from '../types';
import type { Signer, TypedDataSigner, TypedDataField } from '@ethersproject/abstract-signer';
import type { Propose, Vote } from '../../../types';

export class EthereumSig {
  generateSalt() {
    return Number(SplitUint256.fromHex(bytesToHex(randomBytes(4))).toHex());
  }

  public async sign<T extends EIP712ProposeMessage | EIP712VoteMessage>(
    signer: Signer & TypedDataSigner,
    verifyingContract: string,
    message: T,
    types: Record<string, TypedDataField[]>
  ): Promise<SignatureData> {
    const address = await signer.getAddress();

    const domain = {
      ...baseDomain,
      verifyingContract
    };

    const signature = await signer._signTypedData(domain, types, message);

    return {
      address,
      signature,
      domain,
      types,
      message
    };
  }

  public async propose({
    signer,
    data
  }: {
    signer: Signer & TypedDataSigner;
    data: Propose;
  }): Promise<Envelope<Propose>> {
    const author = await signer.getAddress();

    const message: EIP712ProposeMessage = {
      space: data.space,
      author,
      metadataUri: data.metadataUri,
      executionStrategy: {
        addy: data.executor,
        params: '0x00'
      },
      userVotingStrategies: data.strategies.map(index => ({
        index,
        params: '0x00'
      })),
      salt: this.generateSalt()
    };

    const signatureData = await this.sign(signer, data.authenticator, message, proposeTypes);

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
    const voter = await signer.getAddress();

    const message: EIP712VoteMessage = {
      space: data.space,
      voter,
      proposalId: data.proposal,
      choice: data.choice,
      userVotingStrategies: data.strategies.map(index => ({
        index,
        params: '0x00'
      })),
      salt: this.generateSalt()
    };

    const signatureData = await this.sign(signer, data.authenticator, message, voteTypes);

    return {
      signatureData,
      data
    };
  }
}
