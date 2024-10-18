import { getAddress } from '@ethersproject/address';
import { Contract as EthContract } from '@ethersproject/contracts';
import { validateAndParseAddress } from 'starknet';
import L1AvatarExectionStrategyAbi from './abis/l1/L1AvatarExectionStrategy.json';
import { networkProperties } from './overrrides';
import { dropIpfs, ethProvider, getJSON, getSpaceName } from './utils';
import {
  ExecutionStrategy,
  ProposalMetadataItem,
  SpaceMetadataItem,
  StrategiesParsedMetadataDataItem,
  VoteMetadataItem
} from '../.checkpoint/models';

export async function handleSpaceMetadata(space: string, metadataUri: string) {
  const exists = await SpaceMetadataItem.loadEntity(dropIpfs(metadataUri));
  if (exists) return;

  const spaceMetadataItem = new SpaceMetadataItem(dropIpfs(metadataUri));
  spaceMetadataItem.name = getSpaceName(space);
  spaceMetadataItem.about = '';
  spaceMetadataItem.avatar = '';
  spaceMetadataItem.cover = '';
  spaceMetadataItem.external_url = '';
  spaceMetadataItem.github = '';
  spaceMetadataItem.twitter = '';
  spaceMetadataItem.discord = '';
  spaceMetadataItem.voting_power_symbol = '';
  spaceMetadataItem.wallet = '';
  spaceMetadataItem.executors = [];
  spaceMetadataItem.executors_strategies = [];
  spaceMetadataItem.executors_types = [];
  spaceMetadataItem.executors_destinations = [];
  spaceMetadataItem.treasuries = [];
  spaceMetadataItem.labels = [];
  spaceMetadataItem.delegations = [];

  const metadata: any = metadataUri ? await getJSON(metadataUri) : {};

  if (metadata.name) spaceMetadataItem.name = metadata.name;
  if (metadata.description) spaceMetadataItem.about = metadata.description;
  if (metadata.avatar) spaceMetadataItem.avatar = metadata.avatar;
  if (metadata.external_url)
    spaceMetadataItem.external_url = metadata.external_url;

  if (metadata.properties) {
    if (metadata.properties.cover)
      spaceMetadataItem.cover = metadata.properties.cover;

    if (metadata.properties.treasuries) {
      spaceMetadataItem.treasuries = metadata.properties.treasuries.map(
        (treasury: any) => JSON.stringify(treasury)
      );
    }
    if (metadata.properties.labels) {
      spaceMetadataItem.labels = metadata.properties.labels.map((label: any) =>
        JSON.stringify(label)
      );
    }
    if (metadata.properties.delegations) {
      spaceMetadataItem.delegations = metadata.properties.delegations.map(
        (delegation: any) => JSON.stringify(delegation)
      );
    }
    if (metadata.properties.github)
      spaceMetadataItem.github = metadata.properties.github;
    if (metadata.properties.twitter)
      spaceMetadataItem.twitter = metadata.properties.twitter;
    if (metadata.properties.discord)
      spaceMetadataItem.discord = metadata.properties.discord;
    if (metadata.properties.voting_power_symbol) {
      spaceMetadataItem.voting_power_symbol =
        metadata.properties.voting_power_symbol;
    }
    if (
      metadata.properties.execution_strategies &&
      metadata.properties.execution_strategies_types
    ) {
      // In Starknet execution strategies are not always deployed via proxy (e.g. EthRelayer).
      // We have to intercept it there and create single use proxy for it.
      const destinations: string[] = [];
      const uniqueExecutors: string[] = [];
      for (
        let i = 0;
        i < metadata.properties.execution_strategies.length;
        i++
      ) {
        const id = crypto.randomUUID();
        const destination =
          (metadata.properties.execution_destinations?.[i] as string) ?? '';

        destinations.push(destination);
        uniqueExecutors.push(id);

        let executionStrategy = await ExecutionStrategy.loadEntity(id);
        if (!executionStrategy) executionStrategy = new ExecutionStrategy(id);

        executionStrategy.type =
          metadata.properties.execution_strategies_types[i];
        executionStrategy.address = validateAndParseAddress(
          metadata.properties.execution_strategies[i]
        );
        executionStrategy.quorum = '0';
        executionStrategy.timelock_delay = 0n;

        if (executionStrategy.type === 'EthRelayer') {
          const l1Destination = getAddress(destination);

          const l1AvatarExecutionStrategyContract = new EthContract(
            l1Destination,
            L1AvatarExectionStrategyAbi,
            ethProvider
          );

          const quorum = (
            await l1AvatarExecutionStrategyContract.quorum()
          ).toBigInt();
          const treasury = await l1AvatarExecutionStrategyContract.target();

          executionStrategy.destination_address = l1Destination;
          executionStrategy.quorum = quorum;
          executionStrategy.treasury = treasury;
          executionStrategy.treasury_chain = networkProperties.baseChainId;
        }

        await executionStrategy.save();
      }

      spaceMetadataItem.executors =
        metadata.properties.execution_strategies.map((strategy: string) =>
          validateAndParseAddress(strategy)
        );
      spaceMetadataItem.executors_strategies = uniqueExecutors;
      spaceMetadataItem.executors_destinations = destinations;
      spaceMetadataItem.executors_types =
        metadata.properties.execution_strategies_types;
    }
  }

  await spaceMetadataItem.save();
}

export async function handleProposalMetadata(metadataUri: string) {
  const exists = await ProposalMetadataItem.loadEntity(dropIpfs(metadataUri));
  if (exists) return;

  const proposalMetadataItem = new ProposalMetadataItem(dropIpfs(metadataUri));
  proposalMetadataItem.labels = [];

  const metadata: any = await getJSON(metadataUri);
  if (metadata.title) proposalMetadataItem.title = metadata.title;
  if (metadata.body) proposalMetadataItem.body = metadata.body;
  if (metadata.discussion)
    proposalMetadataItem.discussion = metadata.discussion;
  if (metadata.execution)
    proposalMetadataItem.execution = JSON.stringify(metadata.execution);
  if (
    Array.isArray(metadata.labels) &&
    metadata.labels.every((label: string) => typeof label === 'string')
  ) {
    proposalMetadataItem.labels = metadata.labels;
  }

  await proposalMetadataItem.save();
}

export async function handleVoteMetadata(metadataUri: string) {
  const exists = await VoteMetadataItem.loadEntity(dropIpfs(metadataUri));
  if (exists) return;

  const voteMetadataItem = new VoteMetadataItem(dropIpfs(metadataUri));

  const metadata: any = await getJSON(metadataUri);
  voteMetadataItem.reason = metadata.reason ?? '';

  await voteMetadataItem.save();
}

export async function handleStrategiesParsedMetadata(metadataUri: string) {
  const exists = await StrategiesParsedMetadataDataItem.loadEntity(
    dropIpfs(metadataUri)
  );
  if (exists) return;

  const strategiesParsedMetadataItem = new StrategiesParsedMetadataDataItem(
    dropIpfs(metadataUri)
  );

  const metadata: any = await getJSON(metadataUri);
  if (metadata.name) strategiesParsedMetadataItem.name = metadata.name;
  if (metadata.description)
    strategiesParsedMetadataItem.description = metadata.description;

  if (metadata.properties) {
    if (metadata.properties.decimals) {
      strategiesParsedMetadataItem.decimals = metadata.properties.decimals;
    }
    if (metadata.properties.symbol) {
      strategiesParsedMetadataItem.symbol = metadata.properties.symbol;
    }
    if (metadata.properties.token)
      strategiesParsedMetadataItem.token = metadata.properties.token;
    if (metadata.properties.payload) {
      strategiesParsedMetadataItem.payload = metadata.properties.payload;
    }
  }

  await strategiesParsedMetadataItem.save();
}
