import { Contract } from '@ethersproject/contracts';
import { Interface } from '@ethersproject/abi';
import randomBytes from 'randombytes';
import { getAuthenticator } from '../../authenticators/evm';
import { evmGoerli } from '../../networks';
import SpaceAbi from './abis/Space.json';
import SpaceFactoryAbi from './abis/SpaceFactory.json';
import type { Signer } from '@ethersproject/abstract-signer';
import type {
  NetworkConfig,
  ClientOpts,
  Envelope,
  VanillaVoteMessage,
  VanillaProposeMessage
} from '../../types';

type AddressConfig = {
  addy: string;
  params: string;
};

type IndexedConfig = {
  index: number;
  params: string;
};

export class SnapshotEVMClient {
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

    const [spaceAddress, response] = await Promise.all([
      spaceFactoryContract.getSpaceAddress(...args),
      spaceFactoryContract.createSpace(...args)
    ]);

    return { spaceAddress, txId: response.hash };
  }

  async propose({
    signer,
    envelope
  }: {
    signer: Signer;
    envelope: Envelope<VanillaProposeMessage>;
  }) {
    const proposerAddress = await signer.getAddress();

    const spaceInterface = new Interface(SpaceAbi);
    const functionData = spaceInterface.encodeFunctionData('propose', [
      proposerAddress,
      envelope.data.message.metadataUri,
      {
        addy: envelope.data.message.executor,
        params: '0x00'
      } as AddressConfig,
      envelope.data.message.strategies.map(index => ({
        index,
        params: '0x00'
      })) as IndexedConfig[]
    ]);

    const selector = functionData.slice(0, 10);
    const calldata = `0x${functionData.slice(10)}`;

    const authenticator = getAuthenticator(envelope.data.message.authenticator, this.networkConfig);
    if (!authenticator) {
      throw new Error('Invalid authenticator');
    }

    const { abi, args } = authenticator.createCall(envelope, selector, [calldata]);
    const authenticatorContract = new Contract(envelope.data.message.authenticator, abi, signer);
    return authenticatorContract.authenticate(...args);
  }

  async vote({ signer, envelope }: { signer: Signer; envelope: Envelope<VanillaVoteMessage> }) {
    const voterAddress = await signer.getAddress();

    const spaceInterface = new Interface(SpaceAbi);
    const functionData = spaceInterface.encodeFunctionData('vote', [
      voterAddress,
      envelope.data.message.proposal,
      envelope.data.message.choice,
      envelope.data.message.strategies.map(index => ({
        index,
        params: '0x00'
      })) as IndexedConfig[]
    ]);

    const selector = functionData.slice(0, 10);
    const calldata = `0x${functionData.slice(10)}`;

    const authenticator = getAuthenticator(envelope.data.message.authenticator, this.networkConfig);
    if (!authenticator) {
      throw new Error('Invalid authenticator');
    }
    const { abi, args } = authenticator.createCall(envelope, selector, [calldata]);

    const authenticatorContract = new Contract(envelope.data.message.authenticator, abi, signer);
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
