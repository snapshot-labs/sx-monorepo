import db from './mysql';

// Snapshot Plus fees, in gwei
export const VOTE_FEE = 400_000; // 0.0004 ETH
export const PROPOSAL_FEE = 8_000_000; // 0.008 ETH

// SQL conditions on the spaces table. A Pro subscription always wins, and
// Plus is on while the balance covers one proposal
export const SUBSCRIBED = 'turbo = 1 OR turbo_expiration > UNIX_TIMESTAMP()';
export const PLUS = `NOT (${SUBSCRIBED}) AND credits_deposited - credits_spent >= ${PROPOSAL_FEE}`;

// Conditional, so concurrent proposals can't all spend the same balance
export async function chargeProposal(space: string): Promise<void> {
  const { affectedRows } = await db.queryAsync(
    `UPDATE spaces SET credits_spent = credits_spent + ? WHERE id = ? AND ${PLUS} LIMIT 1`,
    [PROPOSAL_FEE, space]
  );
  if (!affectedRows) return Promise.reject('not enough Snapshot Plus credits');
}

export async function refundProposal(space: string): Promise<void> {
  await db.queryAsync(
    'UPDATE spaces SET credits_spent = credits_spent - ? WHERE id = ? LIMIT 1',
    [PROPOSAL_FEE, space]
  );
}
