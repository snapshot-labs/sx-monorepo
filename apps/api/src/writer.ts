import { formatUnits } from '@ethersproject/units';
import { shortStringArrToStr } from '@snapshot-labs/sx/dist/utils/strings';
import { validateAndParseAddress } from 'starknet/utils/address';
import { getSelectorFromName } from 'starknet/utils/hash';
import { faker } from '@faker-js/faker';
import { getJSON, toAddress, getEvent } from './utils';

function getSpaceName(address) {
  const seed = parseInt(getSelectorFromName(address).toString().slice(0, 12));
  faker.seed(seed);
  const noun = faker.word.noun(6);
  return `${noun.charAt(0).toUpperCase()}${noun.slice(1)} DAO`;
}

export async function handleSpaceCreated({ block, tx, event, mysql }) {
  console.log('Handle space created');
  const format =
    'deployer_address, space_address, voting_delay, min_voting_period, max_voting_period, proposal_threshold(uint256), controller, quorum(uint256), strategies_len, strategies(felt*), authenticators_len, authenticators(felt*), executors_len, executors(felt*)';
  event = getEvent(event.data, format);

  const item = {
    id: validateAndParseAddress(event.space_address),
    name: getSpaceName(event.space_address),
    controller: validateAndParseAddress(event.controller),
    voting_delay: BigInt(event.voting_delay).toString(),
    min_voting_period: BigInt(event.min_voting_period).toString(),
    max_voting_period: BigInt(event.max_voting_period).toString(),
    proposal_threshold: event.proposal_threshold,
    quorum: event.quorum,
    strategies: event.strategies.join(','),
    authenticators: event.authenticators.join(','),
    executors: event.executors.join(','),
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
  const space = validateAndParseAddress(event.from_address);
  const [{ strategies }] = await mysql.queryAsync(
    'SELECT strategies FROM spaces WHERE id = ? LIMIT 1',
    [space]
  );
  const proposal = BigInt(event.data[0]).toString();
  const author = toAddress(event.data[1]);
  let title = '';
  let body = '';
  let discussion = '';

  let metadataUri = '';
  try {
    const metadataUriLen = BigInt(event.data[6]).toString();
    const metadataUriArr = event.data.slice(7, 7 + metadataUriLen);
    metadataUri = shortStringArrToStr(metadataUriArr.map(m => BigInt(m)));
  } catch (e) {
    console.log(e);
  }

  try {
    const metadata: any = await getJSON(metadataUri);
    console.log('Metadata', metadata);
    if (metadata.title) title = metadata.title;
    if (metadata.body) body = metadata.body;
    if (metadata.discussion) discussion = metadata.discussion;
  } catch (e) {
    console.log(JSON.stringify(e).slice(0, 256));
  }

  const item = {
    id: `${space}/${proposal}`,
    proposal_id: proposal,
    space,
    author,
    execution_hash: event.data[2],
    metadata_uri: metadataUri,
    title,
    body,
    discussion,
    start: BigInt(event.data[3]).toString(),
    end: BigInt(event.data[4]).toString(),
    snapshot: BigInt(event.data[5]).toString(),
    scores_1: 0,
    scores_2: 0,
    scores_3: 0,
    scores_total: 0,
    strategies,
    created: block.timestamp,
    tx: tx.transaction_hash,
    vote_count: 0
  };

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
  const space = validateAndParseAddress(event.from_address);
  const proposal = BigInt(event.data[0]).toString();
  const voter = toAddress(event.data[1]);
  const choice = BigInt(event.data[2]).toString();
  const vp = parseFloat(formatUnits(BigInt(event.data[3]).toString(), 18));

  const item = {
    id: `${space}/${proposal}/${voter}`,
    space,
    proposal,
    voter,
    choice,
    vp,
    created: block.timestamp
  };

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
