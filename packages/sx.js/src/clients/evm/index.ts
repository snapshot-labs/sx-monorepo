import { Contract, ContractFactory } from '@ethersproject/contracts';
import { Interface } from '@ethersproject/abi';
import VanillaAuthenticatorAbi from './abis/VanillaAuthenticator.json';
import SpaceAbi from './abis/Space.json';
import SpaceBytecode from './abis/bytecode/Space.json';
import type { Signer } from '@ethersproject/abstract-signer';

type Choice = 0 | 1 | 2;

type AddressConfig = {
  addy: string;
  params: string;
};

type IndexedConfig = {
  index: number;
  params: string;
};

export class SnapshotEVMClient {
  async deploy({
    signer,
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
    owner: string;
    votingDelay: number;
    minVotingDuration: number;
    maxVotingDuration: number;
    proposalThreshold: number;
    quorum: number;
    authenticators: string[];
    votingStrategies: AddressConfig[];
    executionStrategies: string[];
  }): Promise<Contract> {
    const factory = new ContractFactory(SpaceAbi, SpaceBytecode.bytecode, signer);

    return factory.deploy(
      owner,
      votingDelay,
      minVotingDuration,
      maxVotingDuration,
      proposalThreshold,
      quorum,
      votingStrategies,
      authenticators,
      executionStrategies
    );
  }

  async propose({
    signer,
    space,
    authenticator,
    userVotingStrategies,
    executionStrategy,
    metadataUri
  }: {
    signer: Signer;
    space: string;
    authenticator: string;
    userVotingStrategies: IndexedConfig[];
    executionStrategy: AddressConfig;
    metadataUri: string;
  }) {
    const spaceInterface = new Interface(SpaceAbi);
    const authenticatorContract = new Contract(authenticator, VanillaAuthenticatorAbi, signer);

    const proposerAddress = await signer.getAddress();

    const functionData = spaceInterface.encodeFunctionData('propose', [
      proposerAddress,
      metadataUri,
      executionStrategy,
      userVotingStrategies
    ]);

    const selector = functionData.slice(0, 10);
    const calldata = `0x${functionData.slice(10)}`;

    return authenticatorContract.authenticate(space, selector, calldata);
  }

  async vote({
    signer,
    space,
    authenticator,
    userVotingStrategies,
    proposal,
    choice
  }: {
    signer: Signer;
    space: string;
    authenticator: string;
    userVotingStrategies: IndexedConfig[];
    proposal: number;
    choice: Choice;
  }) {
    const spaceInterface = new Interface(SpaceAbi);
    const authenticatorContract = new Contract(authenticator, VanillaAuthenticatorAbi, signer);

    const voterAddress = await signer.getAddress();

    const functionData = spaceInterface.encodeFunctionData('vote', [
      voterAddress,
      proposal,
      choice,
      userVotingStrategies
    ]);

    const selector = functionData.slice(0, 10);
    const calldata = `0x${functionData.slice(10)}`;

    return authenticatorContract.authenticate(space, selector, calldata);
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
