import { shortStringArrToStr } from '@snapshot-labs/sx/dist/utils/strings';
import { validateAndParseAddress } from 'starknet/utils/address';
import { getJSON, toAddress, getEvent } from './utils';

export async function handleSpaceCreated({ source, block, tx, receipt, mysql }) {
  console.log('Handle space created');
  const format =
    'voting_delay, min_voting_period, max_voting_period, proposal_threshold(uint256), controller, quorum(uint256), voting_strategies_len, voting_strategies(felt*), authenticators_len, authenticators(felt*), executors_len, executor';
  const event: any = getEvent(receipt.events[0].data, format);
  const item = {
    id: validateAndParseAddress(source.contract),
    name: 'Pistachio DAO',
    controller: validateAndParseAddress(event.controller),
    voting_delay: BigInt(event.voting_delay).toString(),
    min_voting_period: BigInt(event.min_voting_period).toString(),
    max_voting_period: BigInt(event.max_voting_period).toString(),
    proposal_threshold: event.proposal_threshold,
    quorum: event.quorum,
    proposal_count: 0,
    vote_count: 0,
    created: block.timestamp,
    tx: tx.transaction_hash
  };
  const query = `INSERT IGNORE INTO spaces SET ?;`;
  await mysql.queryAsync(query, [item]);
}

export async function handlePropose({ block, tx, receipt, mysql }) {
  console.log('Handle propose');
  const space = validateAndParseAddress(receipt.events[0].from_address);
  const proposal = BigInt(receipt.events[0].data[0]).toString();
  const author = toAddress(receipt.events[0].data[1]);
  let title = '';
  let body = '';
  let discussion = '';

  let metadataUri = '';
  try {
    const metadataUriLen = BigInt(receipt.events[0].data[6]).toString();
    const metadataUriArr = receipt.events[0].data.slice(7, 7 + metadataUriLen);
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
    execution_hash: receipt.events[0].data[2],
    metadata_uri: metadataUri,
    title,
    body,
    discussion,
    start: BigInt(receipt.events[0].data[3]).toString(),
    end: BigInt(receipt.events[0].data[4]).toString(),
    snapshot: BigInt(receipt.events[0].data[5]).toString(),
    scores_1: 0,
    scores_2: 0,
    scores_3: 0,
    scores_total: 0,
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

export async function handleVote({ block, receipt, mysql }) {
  console.log('Handle vote');
  const space = validateAndParseAddress(receipt.events[0].from_address);
  const proposal = BigInt(receipt.events[0].data[0]).toString();
  const voter = toAddress(receipt.events[0].data[1]);
  const choice = BigInt(receipt.events[0].data[2]).toString();
  const vp = BigInt(receipt.events[0].data[3]).toString();

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
