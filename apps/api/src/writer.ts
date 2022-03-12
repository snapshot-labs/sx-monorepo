import { shortStringArrToStr } from '@snapshot-labs/sx';
import mysql from './checkpoint/mysql';
import { toAddress } from './utils';

export async function handleDeploy({ block, tx }) {
  console.log('Handle deploy');
  const item = {
    id: '0x625dc1290b6e936be5f1a3e963cf629326b1f4dfd5a56738dea98e1ad31b7f3',
    name: 'Pistachio DAO',
    voting_delay: 3600,
    voting_period: 86400,
    proposal_threshold: 1,
    proposal_count: 0,
    vote_count: 0,
    created: block.timestamp,
    tx: tx.transaction_hash
  };
  const query = `INSERT IGNORE INTO spaces SET ?;`;
  await mysql.queryAsync(query, [item]);
}

export async function handlePropose({ block, tx, receipt }) {
  console.log('Handle propose', receipt.events);
  const space = receipt.events[0].from_address;
  const proposal = receipt.events[0].data[0];

  let metadataUri = '';
  try {
    const metadataUriLen = receipt.events[0].data[6];
    const metadataUriArr = receipt.events[0].data.slice(7, 7 + metadataUriLen);
    metadataUri = shortStringArrToStr(metadataUriArr.map(m => BigInt(m)));
  } catch (e) {
    console.log(e);
  }

  const item = {
    id: `${space}/${proposal}`,
    proposal_id: proposal,
    space,
    author: toAddress(receipt.events[0].data[1]),
    execution_hash: receipt.events[0].data[2],
    metadata_uri: metadataUri,
    start: receipt.events[0].data[4],
    end: receipt.events[0].data[5],
    snapshot: receipt.events[0].data[6],
    created: block.timestamp,
    tx: tx.transaction_hash
  };
  const query = `
    INSERT IGNORE INTO proposals SET ?
    UPDATE spaces SET proposal_count = proposal_count + 1 WHERE id = ? LIMIT 1;
  `;
  await mysql.queryAsync(query, [item, item.space]);
}

export async function handleVote({ block, receipt }) {
  console.log('Handle vote', receipt.events);
  const space = receipt.events[0].from_address;
  const proposal = receipt.events[0].data[0];
  const voter = toAddress(receipt.events[0].data[1]);
  const item = {
    id: `${space}/${proposal}/${voter}`,
    space: receipt.events[0].from_address,
    proposal: receipt.events[0].data[0],
    voter,
    choice: receipt.events[0].data[2],
    vp: receipt.events[0].data[3],
    created: block.timestamp
  };
  const query = `
    INSERT IGNORE INTO votes SET ?;
    UPDATE spaces SET vote_count = vote_count + 1 WHERE id = ? LIMIT 1;
    UPDATE proposals SET vote_count = vote_count + 1 WHERE id = ? LIMIT 1;
  `;
  await mysql.queryAsync(query, [item, item.space, `${item.space}/${item.proposal}`]);
}
