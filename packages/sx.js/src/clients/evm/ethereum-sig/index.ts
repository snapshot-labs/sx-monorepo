import randomBytes from 'randombytes';
import { AbiCoder } from '@ethersproject/abi';
import { SplitUint256 } from '../../../utils/split-uint256';
import { bytesToHex } from '../../../utils/bytes';
import { getStrategiesParams } from '../../../strategies/evm';
import { evmGoerli } from '../../../networks';
import { domain as baseDomain, proposeTypes, updateProposalTypes, voteTypes } from './types';
import type { Signer, TypedDataSigner, TypedDataField } from '@ethersproject/abstract-signer';
import type {
  Propose,
  UpdateProposal,
  Vote,
  Envelope,
  SignatureData,
  EIP712ProposeMessage,
  EIP712UpdateProposalMessage,
  EIP712VoteMessage
} from '../types';
import type { EvmNetworkConfig } from '../../../types';

type EthereumSigClientOpts = {
  networkConfig?: EvmNetworkConfig;
  manaUrl?: string;
};

export class EthereumSig {
  manaUrl: string;
  networkConfig: EvmNetworkConfig;

  constructor(opts?: EthereumSigClientOpts) {
    this.networkConfig = opts?.networkConfig || evmGoerli;
    this.manaUrl = opts?.manaUrl || 'https://mana.pizza';
  }

  generateSalt() {
    return Number(SplitUint256.fromHex(bytesToHex(randomBytes(4))).toHex());
  }

  public async sign<
    T extends EIP712ProposeMessage | EIP712UpdateProposalMessage | EIP712VoteMessage
  >(
    signer: Signer & TypedDataSigner,
    verifyingContract: string,
    message: T,
    types: Record<string, TypedDataField[]>
  ): Promise<SignatureData> {
    const address = await signer.getAddress();

    const domain = {
      ...baseDomain,
      chainId: this.networkConfig.eip712ChainId,
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

  public async send(envelope) {
    const body = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'send',
        params: { envelope },
        id: null
      })
    };

    const res = await fetch(`${this.manaUrl}/eth_rpc/${this.networkConfig.eip712ChainId}`, body);
    const json = await res.json();

    return json.result;
  }

  public async propose({
    signer,
    data
  }: {
    signer: Signer & TypedDataSigner;
    data: Propose;
  }): Promise<Envelope<Propose>> {
    const author = await signer.getAddress();

    const strategiesParams = await getStrategiesParams(
      'propose',
      data.strategies,
      author,
      data,
      this.networkConfig
    );

    const abiCoder = new AbiCoder();
    const message: EIP712ProposeMessage = {
      space: data.space,
      author,
      metadataURI: data.metadataUri,
      executionStrategy: data.executionStrategy,
      userProposalValidationParams: abiCoder.encode(
        ['tuple(int8 index, bytes params)[]'],
        [
          data.strategies.map((strategyConfig, i) => ({
            index: strategyConfig.index,
            params: strategiesParams[i]
          }))
        ]
      ),
      salt: this.generateSalt()
    };

    const signatureData = await this.sign(signer, data.authenticator, message, proposeTypes);

    return {
      signatureData,
      data
    };
  }

  public async updateProposal({
    signer,
    data
  }: {
    signer: Signer & TypedDataSigner;
    data: UpdateProposal;
  }): Promise<Envelope<UpdateProposal>> {
    const author = await signer.getAddress();

    const message: EIP712UpdateProposalMessage = {
      space: data.space,
      author,
      proposalId: data.proposal,
      executionStrategy: data.executionStrategy,
      metadataURI: data.metadataUri,
      salt: this.generateSalt()
    };

    const signatureData = await this.sign(signer, data.authenticator, message, updateProposalTypes);

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

    const strategiesParams = await getStrategiesParams(
      'vote',
      data.strategies,
      voter,
      data,
      this.networkConfig
    );

    const message: EIP712VoteMessage = {
      space: data.space,
      voter,
      proposalId: data.proposal,
      choice: data.choice,
      userVotingStrategies: data.strategies.map((strategyConfig, i) => ({
        index: strategyConfig.index,
        params: strategiesParams[i]
      })),
      voteMetadataURI: data.metadataUri
    };

    const signatureData = await this.sign(signer, data.authenticator, message, voteTypes);

    return {
      signatureData,
      data
    };
  }
}
