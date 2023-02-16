import { Contract } from '@ethersproject/contracts';
import { Interface } from '@ethersproject/abi';
import { getCreate2Address } from '@ethersproject/address';
import { keccak256 } from '@ethersproject/keccak256';
import randomBytes from 'randombytes';
import { getAuthenticator } from '../../../authenticators/evm';
import { getStrategiesParams } from '../../../strategies/evm';
import { evmGoerli } from '../../../networks';
import SpaceAbi from './abis/Space.json';
import SpaceFactoryAbi from './abis/SpaceFactory.json';
import SpaceBytecode from './abis/bytecode/Space.json';
import type { Signer } from '@ethersproject/abstract-signer';
import type { Propose, Vote, Envelope, AddressConfig } from '../types';
import type { NetworkConfig, ClientOpts } from '../../../types';

export class EthereumTx {
  networkConfig: NetworkConfig;

  constructor(opts?: Pick<ClientOpts, 'networkConfig'>) {
    this.networkConfig = opts?.networkConfig || evmGoerli;
  }

  async deploy({
    signer,
    spaceFactory,
    owner,
    votingDelay,
    minVotingDuration,
    maxVotingDuration,
    proposalThreshold,
    quorum,
    authenticators,
    votingStrategies,
    executionStrategies
  }: {
    signer: Signer;
    spaceFactory: string;
    owner: string;
    votingDelay: number;
    minVotingDuration: number;
    maxVotingDuration: number;
    proposalThreshold: number;
    quorum: number;
    authenticators: string[];
    votingStrategies: AddressConfig[];
    executionStrategies: string[];
  }): Promise<{ txId: string; spaceAddress: string }> {
    const spaceInterface = new Interface(SpaceAbi);
    const spaceFactoryContract = new Contract(spaceFactory, SpaceFactoryAbi, signer);

    const salt = `0x${randomBytes(32).toString('hex')}`;
    const args = [
      owner,
      votingDelay,
      minVotingDuration,
      maxVotingDuration,
      proposalThreshold,
      quorum,
      votingStrategies,
      authenticators,
      executionStrategies,
      salt
    ];

    const functionData = spaceInterface.encodeDeploy(args.slice(0, -1));
    const initCode = SpaceBytecode + functionData.slice(2);

    const initCodeHash = keccak256(initCode);
    const spaceAddress = getCreate2Address(spaceFactory, salt, initCodeHash);
    const response = await spaceFactoryContract.createSpace(...args);

    return { spaceAddress, txId: response.hash };
  }

  async propose({ signer, envelope }: { signer: Signer; envelope: Envelope<Propose> }) {
    const proposerAddress = await signer.getAddress();
    const strategiesParams = await getStrategiesParams(
      'propose',
      envelope.data.strategies,
      proposerAddress,
      envelope.data,
      this.networkConfig
    );

    const spaceInterface = new Interface(SpaceAbi);
    const functionData = spaceInterface.encodeFunctionData('propose', [
      proposerAddress,
      envelope.data.metadataUri,
      {
        addy: envelope.data.executor,
        params: '0x00'
      } as AddressConfig,
      envelope.data.strategies.map((strategyConfig, i) => ({
        index: strategyConfig.index,
        params: strategiesParams[i]
      }))
    ]);

    const selector = functionData.slice(0, 10);
    const calldata = `0x${functionData.slice(10)}`;

    const authenticator = getAuthenticator(envelope.data.authenticator, this.networkConfig);
    if (!authenticator) {
      throw new Error('Invalid authenticator');
    }

    const { abi, args } = authenticator.createCall(envelope, selector, [calldata]);
    const authenticatorContract = new Contract(envelope.data.authenticator, abi, signer);
    return authenticatorContract.authenticate(...args);
  }

  async vote({ signer, envelope }: { signer: Signer; envelope: Envelope<Vote> }) {
    const voterAddress = await signer.getAddress();
    const strategiesParams = await getStrategiesParams(
      'propose',
      envelope.data.strategies,
      voterAddress,
      envelope.data,
      this.networkConfig
    );

    const spaceInterface = new Interface(SpaceAbi);
    const functionData = spaceInterface.encodeFunctionData('vote', [
      voterAddress,
      envelope.data.proposal,
      envelope.data.choice,
      envelope.data.strategies.map((strategyConfig, i) => ({
        index: strategyConfig.index,
        params: strategiesParams[i]
      }))
    ]);

    const selector = functionData.slice(0, 10);
    const calldata = `0x${functionData.slice(10)}`;

    const authenticator = getAuthenticator(envelope.data.authenticator, this.networkConfig);
    if (!authenticator) {
      throw new Error('Invalid authenticator');
    }
    const { abi, args } = authenticator.createCall(envelope, selector, [calldata]);

    const authenticatorContract = new Contract(envelope.data.authenticator, abi, signer);
    return authenticatorContract.authenticate(...args);
  }

  async finalizeProposal({
    signer,
    space,
    proposal,
    executionParams
  }: {
    signer: Signer;
    space: string;
    proposal: number;
    executionParams: string;
  }) {
    const spaceContract = new Contract(space, SpaceAbi, signer);

    return spaceContract.finalizeProposal(proposal, executionParams);
  }

  async cancelProposal({
    signer,
    space,
    proposal,
    executionParams
  }: {
    signer: Signer;
    space: string;
    proposal: number;
    executionParams: string;
  }) {
    const spaceContract = new Contract(space, SpaceAbi, signer);

    return spaceContract.cancelProposal(proposal, executionParams);
  }

  async getProposal({
    signer,
    space,
    proposal
  }: {
    signer: Signer;
    space: string;
    proposal: number;
  }) {
    const spaceContract = new Contract(space, SpaceAbi, signer);

    return spaceContract.getProposal(proposal);
  }

  async getProposalStatus({
    signer,
    space,
    proposal
  }: {
    signer: Signer;
    space: string;
    proposal: number;
  }) {
    const spaceContract = new Contract(space, SpaceAbi, signer);

    return spaceContract.getProposalStatus(proposal);
  }

  async setMaxVotingDuration({
    signer,
    space,
    maxVotingDuration
  }: {
    signer: Signer;
    space: string;
    maxVotingDuration: number;
  }) {
    const spaceContract = new Contract(space, SpaceAbi, signer);

    return spaceContract.setMaxVotingDuration(maxVotingDuration);
  }

  async setMinVotingDuration({
    signer,
    space,
    minVotingDuration
  }: {
    signer: Signer;
    space: string;
    minVotingDuration: number;
  }) {
    const spaceContract = new Contract(space, SpaceAbi, signer);

    return spaceContract.setMinVotingDuration(minVotingDuration);
  }

  async setMetadataUri({
    signer,
    space,
    metadataUri
  }: {
    signer: Signer;
    space: string;
    metadataUri: string;
  }) {
    const spaceContract = new Contract(space, SpaceAbi, signer);

    return spaceContract.setMetadataUri(metadataUri);
  }

  async setProposalThreshold({
    signer,
    space,
    threshold
  }: {
    signer: Signer;
    space: string;
    threshold: number;
  }) {
    const spaceContract = new Contract(space, SpaceAbi, signer);

    return spaceContract.setProposalThreshold(threshold);
  }

  async setVotingDelay({
    signer,
    space,
    votingDelay
  }: {
    signer: Signer;
    space: string;
    votingDelay: number;
  }) {
    const spaceContract = new Contract(space, SpaceAbi, signer);

    return spaceContract.setVotingDelay(votingDelay);
  }
}
