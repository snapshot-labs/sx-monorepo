import { CallData, validateAndParseAddress } from 'starknet';
import { utils } from '@snapshot-labs/sx';
import EncodersAbi from './abis/encoders.json';
import { CheckpointWriter } from '@snapshot-labs/checkpoint';
import { handleProposalMetadata, handleSpaceMetadata } from './ipfs';
import {
  getCurrentTimestamp,
  dropIpfs,
  findVariant,
  getVoteValue,
  handleExecutionStrategy,
  handleStrategiesMetadata,
  longStringToText
} from './utils';

const PROPOSITION_POWER_PROPOSAL_VALIDATION_STRATEGY =
  '0x38f034f17941669555fca61c43c67a517263aaaab833b26a1ab877a21c0bb6d';
const encodersAbi = new CallData(EncodersAbi);

export const handleSpaceDeployed: CheckpointWriter = async ({ blockNumber, event, instance }) => {
  console.log('Handle space deployed');

  if (!event) return;

  await instance.executeTemplate('Space', {
    contract: event.contract_address,
    start: blockNumber
  });
};

export const handleSpaceCreated: CheckpointWriter = async ({ block, tx, event, mysql }) => {
  console.log('Handle space created');

  if (!event) return;

  const strategies = event.voting_strategies.map(strategy => strategy.address);
  const strategiesParams = event.voting_strategies.map(strategy => strategy.params.join(',')); // different format than sx-evm
  const strategiesMetadataUris = event.voting_strategy_metadata_uris.map(array =>
    longStringToText(array)
  );

  const item = {
    id: validateAndParseAddress(event.space),
    metadata: null as string | null,
    controller: validateAndParseAddress(event.owner),
    voting_delay: BigInt(event.voting_delay).toString(),
    min_voting_period: BigInt(event.min_voting_duration).toString(),
    max_voting_period: BigInt(event.max_voting_duration).toString(),
    proposal_threshold: 0,
    strategies: JSON.stringify(strategies),
    strategies_params: JSON.stringify(strategiesParams),
    strategies_metadata: JSON.stringify(strategiesMetadataUris),
    authenticators: JSON.stringify(event.authenticators),
    validation_strategy: event.proposal_validation_strategy.address,
    validation_strategy_params: event.proposal_validation_strategy.params.join(','),
    voting_power_validation_strategy_strategies: JSON.stringify([]),
    voting_power_validation_strategy_strategies_params: JSON.stringify([]),
    proposal_count: 0,
    vote_count: 0,
    created: block?.timestamp ?? getCurrentTimestamp(),
    tx: tx.transaction_hash
  };

  if (
    utils.encoding.hexPadLeft(event.proposal_validation_strategy.address) ===
    utils.encoding.hexPadLeft(PROPOSITION_POWER_PROPOSAL_VALIDATION_STRATEGY)
  ) {
    const parsed = encodersAbi.parse(
      'proposition_power_params',
      event.proposal_validation_strategy.params
    ) as Record<string, any>;

    if (Object.keys(parsed).length !== 0) {
      item.proposal_threshold = parsed.proposal_threshold;
      item.voting_power_validation_strategy_strategies = JSON.stringify(
        parsed.allowed_strategies.map(strategy => `0x${strategy.address.toString(16)}`)
      );
      item.voting_power_validation_strategy_strategies_params = JSON.stringify(
        parsed.allowed_strategies.map(strategy =>
          strategy.params.map(param => `0x${param.toString(16)}`).join(',')
        )
      );
    }
  }
  try {
    const metadataUri = longStringToText(event.metadata_uri || []).replaceAll('\x00', '');
    await handleSpaceMetadata(item.id, metadataUri, mysql);

    item.metadata = dropIpfs(metadataUri);
  } catch (e) {
    console.log('failed to parse space metadata', e);
  }

  try {
    await handleStrategiesMetadata(item.id, strategiesMetadataUris, mysql);
  } catch (e) {
    console.log('failed to handle strategies metadata', e);
  }

  const query = `INSERT IGNORE INTO spaces SET ?;`;
  await mysql.queryAsync(query, [item]);
};

export const handleMetadataUriUpdated: CheckpointWriter = async ({ rawEvent, event, mysql }) => {
  if (!event || !rawEvent) return;

  console.log('Handle space metadata uri updated');

  const space = validateAndParseAddress(rawEvent.from_address);

  try {
    const metadataUri = longStringToText(event.metadata_uri).replaceAll('\x00', '');
    await handleSpaceMetadata(space, metadataUri, mysql);

    const query = `UPDATE spaces SET metadata = ? WHERE id = ? LIMIT 1;`;
    await mysql.queryAsync(query, [dropIpfs(metadataUri), space]);
  } catch (e) {
    console.log('failed to update space metadata', e);
  }
};

export const handleMinVotingDurationUpdated: CheckpointWriter = async ({
  rawEvent,
  event,
  mysql
}) => {
  if (!event || !rawEvent) return;

  console.log('Handle space min voting duration updated');

  const space = validateAndParseAddress(rawEvent.from_address);

  const query = `UPDATE spaces SET min_voting_period = ? WHERE id = ? LIMIT 1;`;
  await mysql.queryAsync(query, [BigInt(event.min_voting_duration).toString(), space]);
};

export const handleMaxVotingDurationUpdated: CheckpointWriter = async ({
  rawEvent,
  event,
  mysql
}) => {
  if (!event || !rawEvent) return;

  console.log('Handle space max voting duration updated');

  const space = validateAndParseAddress(rawEvent.from_address);

  const query = `UPDATE spaces SET max_voting_period = ? WHERE id = ? LIMIT 1;`;
  await mysql.queryAsync(query, [BigInt(event.max_voting_duration).toString(), space]);
};

export const handleOwnershipTransferred: CheckpointWriter = async ({ rawEvent, event, mysql }) => {
  if (!event || !rawEvent) return;

  console.log('Handle space ownership transferred');

  const space = validateAndParseAddress(rawEvent.from_address);

  const query = `UPDATE spaces SET controller = ? WHERE id = ? LIMIT 1;`;
  await mysql.queryAsync(query, [validateAndParseAddress(event.new_owner), space]);
};

export const handleVotingDelayUpdated: CheckpointWriter = async ({ rawEvent, event, mysql }) => {
  if (!event || !rawEvent) return;

  console.log('Handle space voting delay updated');

  const space = validateAndParseAddress(rawEvent.from_address);

  const query = `UPDATE spaces SET voting_delay = ? WHERE id = ? LIMIT 1;`;
  await mysql.queryAsync(query, [BigInt(event.voting_delay).toString(), space]);
};

export const handlePropose: CheckpointWriter = async ({ block, tx, rawEvent, event, mysql }) => {
  if (!rawEvent || !event) return;

  console.log('Handle propose');

  const space = validateAndParseAddress(rawEvent.from_address);
  const [{ strategies, strategies_params }] = await mysql.queryAsync(
    'SELECT strategies, strategies_params FROM spaces WHERE id = ? LIMIT 1',
    [space]
  );
  const proposal = parseInt(BigInt(event.proposal_id).toString());
  const author = findVariant(event.author).value;

  const created = block?.timestamp ?? getCurrentTimestamp();

  const item = {
    id: `${space}/${proposal}`,
    proposal_id: proposal,
    space,
    author,
    metadata: null as string | null,
    execution_hash: event.proposal.execution_hash,
    start: parseInt(BigInt(event.proposal.start_timestamp).toString()),
    min_end: parseInt(BigInt(event.proposal.min_end_timestamp).toString()),
    max_end: parseInt(BigInt(event.proposal.max_end_timestamp).toString()),
    snapshot: parseInt(BigInt(event.proposal.start_timestamp).toString()),
    execution_time: 0,
    execution_strategy: validateAndParseAddress(event.proposal.execution_strategy),
    execution_strategy_type: 'none',
    scores_1: 0,
    scores_2: 0,
    scores_3: 0,
    scores_total: 0,
    quorum: 0n,
    strategies,
    strategies_params,
    created,
    tx: tx.transaction_hash,
    execution_tx: null,
    veto_tx: null,
    vote_count: 0,
    executed: false,
    vetoed: false,
    completed: false,
    cancelled: false
  };

  const executionStrategy = await handleExecutionStrategy(
    event.proposal.execution_strategy,
    event.payload
  );
  if (executionStrategy) {
    item.execution_strategy_type = executionStrategy.executionStrategyType;
    item.quorum = executionStrategy.quorum;
  }

  try {
    const metadataUri = longStringToText(event.metadata_uri);
    await handleProposalMetadata(metadataUri, mysql);

    item.metadata = dropIpfs(metadataUri);
  } catch (e) {
    console.log(JSON.stringify(e).slice(0, 256));
  }

  console.log('Proposal', item);

  const user = {
    id: author,
    vote_count: 0,
    proposal_count: 0,
    created
  };

  const query = `
    INSERT IGNORE INTO proposals SET ?;
    UPDATE spaces SET proposal_count = proposal_count + 1 WHERE id = ? LIMIT 1;
    INSERT IGNORE INTO users SET ?;
    UPDATE users SET proposal_count = proposal_count + 1 WHERE id = ? LIMIT 1;
  `;
  await mysql.queryAsync(query, [item, item.space, user, author]);
};

export const handleCancel: CheckpointWriter = async ({ rawEvent, event, mysql }) => {
  if (!rawEvent || !event) return;

  console.log('Handle cancel');

  const space = validateAndParseAddress(rawEvent.from_address);
  const proposalId = `${space}/${parseInt(event.proposal_id)}`;

  const [{ vote_count }] = await mysql.queryAsync(
    `SELECT vote_count FROM proposals WHERE id = ? LIMIT 1`,
    [proposalId]
  );

  const query = `
    UPDATE proposals SET cancelled = true WHERE id = ? LIMIT 1;
    UPDATE spaces SET proposal_count = proposal_count - 1, vote_count = vote_count - ? WHERE id = ? LIMIT 1;
  `;

  await mysql.queryAsync(query, [proposalId, vote_count, space]);
};

export const handleUpdate: CheckpointWriter = async ({ block, rawEvent, event, mysql }) => {
  if (!rawEvent || !event) return;

  console.log('Handle update');

  const space = validateAndParseAddress(rawEvent.from_address);
  const proposalId = `${space}/${parseInt(event.proposal_id)}`;
  const metadataUri = longStringToText(event.metadata_uri);

  try {
    await handleProposalMetadata(metadataUri, mysql);

    const query = `UPDATE proposals SET metadata = ?, edited = ? WHERE id = ? LIMIT 1;`;
    await mysql.queryAsync(query, [
      dropIpfs(metadataUri),
      block?.timestamp ?? getCurrentTimestamp(),
      proposalId
    ]);
  } catch (e) {
    console.log('failed to update proposal metadata', e);
  }

  const executionStrategy = await handleExecutionStrategy(
    event.proposal.execution_strategy,
    event.payload
  );
  if (executionStrategy) {
    const query = `UPDATE proposals SET execution_strategy_type = ?, quorum = ? WHERE id = ? LIMIT 1;`;
    await mysql.queryAsync(query, [
      executionStrategy.executionStrategyType,
      executionStrategy.quorum,
      proposalId
    ]);
  }
};

export const handleExecute: CheckpointWriter = async ({ tx, rawEvent, event, mysql }) => {
  if (!rawEvent || !event) return;

  console.log('Handle execute');

  const space = validateAndParseAddress(rawEvent.from_address);
  const proposalId = `${space}/${parseInt(event.proposal_id)}`;

  const query = `UPDATE proposals SET executed = true, completed = true, execution_tx = ? WHERE id = ? LIMIT 1;`;
  await mysql.queryAsync(query, [tx.transaction_hash, proposalId]);
};

export const handleVote: CheckpointWriter = async ({ block, rawEvent, event, mysql }) => {
  if (!rawEvent || !event) return;

  console.log('Handle vote');

  const space = validateAndParseAddress(rawEvent.from_address);
  const proposal = parseInt(event.proposal_id);
  const voter = findVariant(event.voter).value;
  const choice = getVoteValue(findVariant(event.choice).key);
  const vp = BigInt(event.voting_power);

  const created = block?.timestamp ?? getCurrentTimestamp();

  const item = {
    id: `${space}/${proposal}/${voter}`,
    space,
    proposal,
    voter,
    choice,
    vp,
    created
  };
  console.log('Vote', item);

  const user = {
    id: voter,
    vote_count: 0,
    proposal_count: 0,
    created
  };

  const query = `
    INSERT IGNORE INTO votes SET ?;
    UPDATE spaces SET vote_count = vote_count + 1 WHERE id = ? LIMIT 1;
    UPDATE proposals SET vote_count = vote_count + 1, scores_total = scores_total + ?, scores_${item.choice} = scores_${item.choice} + ? WHERE id = ? LIMIT 1;
    INSERT IGNORE INTO users SET ?;
    UPDATE users SET vote_count = vote_count + 1 WHERE id = ? LIMIT 1;
  `;
  await mysql.queryAsync(query, [
    item,
    item.space,
    item.vp,
    item.vp,
    `${item.space}/${item.proposal}`,
    user,
    voter
  ]);
};
