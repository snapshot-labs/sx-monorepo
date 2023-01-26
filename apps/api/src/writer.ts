import { formatUnits } from '@ethersproject/units';
import { shortStringArrToStr } from '@snapshot-labs/sx/dist/utils/strings';
import { validateAndParseAddress } from 'starknet';
import { getJSON, toAddress, getSpaceName, parseTimestamps } from './utils';
import type { CheckpointWriter } from '@snapshot-labs/checkpoint';

function intSequenceToString(intSequence) {
  const sequenceStr = shortStringArrToStr(intSequence);
  return (sequenceStr.split(/(.{9})/) || [])
    .filter(str => str !== '')
    .map(str => str.replace('\x00', '').split('').reverse().join(''))
    .join('');
}

function uint256toString(uint256) {
  return (BigInt(uint256.low) + (BigInt(uint256.high) << BigInt(128))).toString();
}

export const handleSpaceCreated: CheckpointWriter = async ({
  block,
  tx,
  event,
  mysql,
  instance
}) => {
  if (!event) return;

  console.log('Handle space created');

  const item = {
    id: validateAndParseAddress(event.space_address),
    name: getSpaceName(event.space_address),
    controller: validateAndParseAddress(event.controller),
    voting_delay: BigInt(event.voting_delay).toString(),
    min_voting_period: BigInt(event.min_voting_duration).toString(),
    max_voting_period: BigInt(event.max_voting_duration).toString(),
    proposal_threshold: uint256toString(event.proposal_threshold),
    quorum: uint256toString(event.quorum),
    strategies: JSON.stringify(event.voting_strategies),
    strategies_params: JSON.stringify(event.voting_strategy_params_flat),
    authenticators: JSON.stringify(event.authenticators),
    executors: JSON.stringify(event.executors),
    proposal_count: 0,
    vote_count: 0,
    created: block.timestamp,
    tx: tx.transaction_hash
  };

  instance.executeTemplate('Space', {
    contract: item.id,
    start: block.block_number
  });

  const query = `INSERT IGNORE INTO spaces SET ?;`;
  await mysql.queryAsync(query, [item]);
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
  const author = toAddress(event.proposer_address.value);
  let title = '';
  let body = '';
  let discussion = '';
  let execution = '';
  let metadataUri = '';

  try {
    metadataUri = intSequenceToString(event.metadata_uri);
    const metadata: any = await getJSON(metadataUri);
    console.log('Metadata', metadata);
    if (metadata.title) title = metadata.title;
    if (metadata.body) body = metadata.body;
    if (metadata.discussion) discussion = metadata.discussion;
    if (metadata.execution) execution = JSON.stringify(metadata.execution);
  } catch (e) {
    console.log(JSON.stringify(e).slice(0, 256));
  }

  const timestamps = parseTimestamps(event.proposal.timestamps);
  if (!timestamps) return;

  const item = {
    id: `${space}/${proposal}`,
    proposal_id: proposal,
    space,
    author,
    execution_hash: event.proposal.execution_hash,
    metadata_uri: metadataUri,
    title,
    body,
    discussion,
    execution,
    start: parseInt(BigInt(timestamps.start).toString()),
    min_end: parseInt(BigInt(timestamps.minEnd).toString()),
    max_end: parseInt(BigInt(timestamps.maxEnd).toString()),
    snapshot: parseInt(BigInt(timestamps.snapshot).toString()),
    scores_1: 0,
    scores_2: 0,
    scores_3: 0,
    scores_total: 0,
    quorum: uint256toString(event.proposal.quorum),
    strategies,
    strategies_params,
    created: block.timestamp,
    tx: tx.transaction_hash,
    vote_count: 0
  };
  console.log('Proposal', item);

  const user = {
    id: author,
    vote_count: 0,
    proposal_count: 0,
    created: block.timestamp
  };

  const query = `
    INSERT IGNORE INTO proposals SET ?;
    UPDATE spaces SET proposal_count = proposal_count + 1 WHERE id = ? LIMIT 1;
    INSERT IGNORE INTO users SET ?;
    UPDATE users SET proposal_count = proposal_count + 1 WHERE id = ? LIMIT 1;
  `;
  await mysql.queryAsync(query, [item, item.space, user, author]);
};

export const handleVote: CheckpointWriter = async ({ block, rawEvent, event, mysql }) => {
  if (!rawEvent || !event) return;

  console.log('Handle vote', event);

  const space = validateAndParseAddress(rawEvent.from_address);
  const proposal = parseInt(event.proposal_id);
  const voter = toAddress(event.voter_address.value);
  const choice = parseInt(BigInt(event.vote.choice).toString());
  const vp = parseFloat(formatUnits(uint256toString(event.vote.voting_power), 18));

  const item = {
    id: `${space}/${proposal}/${voter}`,
    space,
    proposal,
    voter,
    choice,
    vp,
    created: block.timestamp
  };
  console.log('Vote', item);

  const user = {
    id: voter,
    vote_count: 0,
    proposal_count: 0,
    created: block.timestamp
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
