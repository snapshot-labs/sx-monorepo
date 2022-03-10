import mysql from './checkpoint/mysql';
import { toAddress } from './utils';

export async function handleProposalCreated({ block, tx, receipt }) {
  console.log('handleProposalCreated', receipt.events);
  const space = receipt.events[0].from_address;
  const proposal = receipt.events[0].data[0];
  const item = {
    id: `${space}/${proposal}`,
    space,
    author: toAddress(receipt.events[0].data[1]),
    execution: receipt.events[0].data[2],
    metadata: receipt.events[0].data[3],
    start: receipt.events[0].data[4],
    end: receipt.events[0].data[5],
    snapshot: receipt.events[0].data[6],
    created: block.timestamp,
    tx: tx.transaction_hash
  };
  const query = 'INSERT IGNORE INTO proposals SET ?';
  await mysql.queryAsync(query, [item]);
}

export async function handleVoteCreated({ block, tx, receipt }) {
  console.log('handleVoteCreated', receipt.events);
  const space = receipt.events[0].from_address;
  const proposal = receipt.events[0].data[0];
  const voter = receipt.events[0].data[1];
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
    UPDATE proposals SET vote_count = vote_count + 1 WHERE id = ? LIMIT 1;
  `;
  await mysql.queryAsync(query, [item, `${item.space}/${item.proposal}`]);
}
