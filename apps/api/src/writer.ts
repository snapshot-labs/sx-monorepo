import { formatUnits } from '@ethersproject/units';
import { shortStringArrToStr } from '@snapshot-labs/sx/dist/utils/strings';
import { validateAndParseAddress } from 'starknet/utils/address';
import { getJSON, toAddress, getEvent, getSpaceName } from './utils';

function intSequenceToString(intSequence) {
  const sequenceStr = shortStringArrToStr(intSequence);
  return (sequenceStr.split(/(.{9})/) || [])
    .filter(str => str !== '')
    .map(str => str.replace('\x00', '').split('').reverse().join(''))
    .join('');
}

export async function handleSpaceCreated({ block, tx, event, mysql }) {
  console.log('Handle space created');
  const format =
    'deployer_address, space_address, voting_delay, min_voting_period, max_voting_period, proposal_threshold(uint256), controller, quorum(uint256), strategies_len, strategies(felt*), strategies_params_len, strategies_params(felt*), authenticators_len, authenticators(felt*), executors_len, executors(felt*)';
  const data: any = getEvent(event.data, format);

  const item = {
    id: validateAndParseAddress(data.space_address),
    name: getSpaceName(data.space_address),
    controller: validateAndParseAddress(data.controller),
    voting_delay: BigInt(data.voting_delay).toString(),
    min_voting_period: BigInt(data.min_voting_period).toString(),
    max_voting_period: BigInt(data.max_voting_period).toString(),
    proposal_threshold: data.proposal_threshold,
    quorum: data.quorum,
    strategies: JSON.stringify(data.strategies),
    strategies_params: JSON.stringify(data.strategies_params),
    authenticators: JSON.stringify(data.authenticators),
    executors: JSON.stringify(data.executors),
    proposal_count: 0,
    vote_count: 0,
    created: block.timestamp,
    tx: tx.transaction_hash
  };
  const query = `INSERT IGNORE INTO spaces SET ?;`;
  await mysql.queryAsync(query, [item]);
}

export async function handlePropose({ block, tx, event, mysql }) {
  console.log('Handle propose');
  const format =
    'proposal, author, quorum(uint256), snapshot, start, min_end, max_end, executor, execution_hash, metadata_uri_len, metadata_uri(felt*)';
  const data: any = getEvent(event.data, format);

  const space = validateAndParseAddress(event.from_address);
  const [{ strategies, strategies_params }] = await mysql.queryAsync(
    'SELECT strategies, strategies_params FROM spaces WHERE id = ? LIMIT 1',
    [space]
  );
  const proposal = parseInt(BigInt(data.proposal).toString());
  const author = toAddress(data.author);
  let title = '';
  let body = '';
  let discussion = '';
  let execution = '';
  let metadataUri = '';

  try {
    metadataUri = intSequenceToString(data.metadata_uri);
    const metadata: any = await getJSON(metadataUri);
    console.log('Metadata', metadata);
    if (metadata.title) title = metadata.title;
    if (metadata.body) body = metadata.body;
    if (metadata.discussion) discussion = metadata.discussion;
    if (metadata.execution) execution = JSON.stringify(metadata.execution);
  } catch (e) {
    console.log(JSON.stringify(e).slice(0, 256));
  }

  const item = {
    id: `${space}/${proposal}`,
    proposal_id: proposal,
    space,
    author,
    execution_hash: data.execution_hash,
    metadata_uri: metadataUri,
    title,
    body,
    discussion,
    execution,
    start: parseInt(BigInt(data.start).toString()),
    end: parseInt(BigInt(data.max_end).toString()),
    min_end: parseInt(BigInt(data.min_end).toString()),
    max_end: parseInt(BigInt(data.max_end).toString()),
    snapshot: parseInt(BigInt(data.snapshot).toString()),
    scores_1: 0,
    scores_2: 0,
    scores_3: 0,
    scores_total: 0,
    quorum: data.quorum,
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
}

export async function handleVote({ block, event, mysql }) {
  console.log('Handle vote');
  const format = 'proposal, voter, choice, vp';
  const data: any = getEvent(event.data, format);

  const space = validateAndParseAddress(event.from_address);
  const proposal = parseInt(BigInt(data.proposal).toString());
  const voter = toAddress(data.voter);
  const choice = parseInt(BigInt(data.choice).toString());
  const vp = parseFloat(formatUnits(BigInt(data.vp).toString(), 18));

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
}
