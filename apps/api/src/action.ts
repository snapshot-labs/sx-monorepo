import mysql from './mysql';

export default async function action(source, block, tx, receipt) {
  console.log('Action for', source.contract, tx.type);
  console.log('Events', receipt.events.length);
  const vote = {
    id: tx.transaction_hash,
    voter: '0xeF8305E140ac520225DAf050e2f71d5fBcC543e7',
    proposal: '0x8f974b76d4f50ea26a1f44843dcda2e0f6a4736883968b29996d272b86b447a9',
    choice: Math.ceil(Math.random() * 3),
    created: block.timestamp
  };
  const query = 'INSERT IGNORE INTO votes SET ?';
  await mysql.queryAsync(query, [vote]);
}
