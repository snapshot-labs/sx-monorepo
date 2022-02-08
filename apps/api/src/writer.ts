import mysql from './mysql';

export function feltToString(events) {
  if (!events || events.length < 1 || !events[0].data || events[0].data.length < 8) return '';
  const str = events[0].data
    .slice(5, 7)
    .map(str => BigInt(str).toString(16))
    .join('');
  return `0x${str}`;
}

export async function handleVoteReceived({ block, tx, receipt }) {
  if (receipt.events.length > 0) console.log('Sig', feltToString(receipt.events));
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
