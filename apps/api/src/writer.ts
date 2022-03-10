import mysql from './checkpoint/mysql';
import { toAddress } from './utils';

export async function handleProposalCreated({ block, tx, receipt }) {
  console.log('handleProposalCreated', receipt.events);
  const item = {
    id: receipt.events[0].data[0],
    space: receipt.events[0].from_address,
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
  const item = {
    id: tx.transaction_hash,
    voter: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7',
    proposal: '0x8f974b76d4f50ea26a1f44843dcda2e0f6a4736883968b29996d272b86b447a9',
    choice: Math.ceil(Math.random() * 3),
    created: block.timestamp
  };
  const query = 'INSERT IGNORE INTO votes SET ?';
  await mysql.queryAsync(query, [item]);
}
