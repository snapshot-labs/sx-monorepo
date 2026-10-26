import { Wallet } from '@ethersproject/wallet';
import fetch from 'node-fetch';
import db from '../../src/helpers/mysql';

export const HOST = `http://localhost:${process.env.PORT || 3030}`;

/** The eligibility public key frozen in the fixtures' committee config. */
const ELIGIBILITY_KEY = `0x${'ab'.repeat(48)}`;

// Fixed keys, so each signature recovers to a known committee index.
export const KEYPERS = [
  new Wallet(`0x${'11'.repeat(32)}`),
  new Wallet(`0x${'22'.repeat(32)}`),
  new Wallet(`0x${'33'.repeat(32)}`)
];

/** A 2-of-3 committee of `KEYPERS`, as stored in `te_sgp_config`. */
export function committee(overrides: Record<string, any> = {}) {
  return {
    v: 1,
    keypers: KEYPERS.map((w, i) => ({
      address: w.address,
      url: `https://k${i + 1}.example`
    })),
    thresholdT: 2,
    thresholdN: 3,
    eligibilityKey: ELIGIBILITY_KEY,
    resultPublisherAddress: `0x${'cd'.repeat(20)}`,
    adminAddress: `0x${'e5'.repeat(20)}`,
    votingStart: 1,
    votingEnd: 2,
    weightedBudget: 100,
    ...overrides
  };
}

/** A closed private proposal row; `te_config.budget` matches `weightedBudget`. */
export function proposalRow(id: string, overrides: Record<string, any> = {}) {
  return {
    id,
    ipfs: `bafkrei${id.slice(-12)}`,
    author: `0x${'e5'.repeat(20)}`,
    created: 1,
    space: 'test.eth',
    network: '1',
    symbol: '',
    type: 'weighted',
    strategies: '[]',
    validation: '{}',
    plugins: '{}',
    title: 'sgp fixture',
    body: '',
    discussion: '',
    choices: JSON.stringify(['Yes', 'No']),
    start: 1,
    end: 2,
    quorum: 0,
    privacy: 'shutter-elgamal',
    snapshot: 1,
    app: '',
    scores: '[]',
    scores_by_strategy: '[]',
    scores_state: 'pending',
    scores_total: 0,
    scores_updated: 0,
    vp_value_by_strategy: '[]',
    votes: 0,
    te_config: JSON.stringify({
      numCandidates: 2,
      budget: 100,
      mode: 'exact',
      variant: 'A',
      scale: 1
    }),
    te_sgp_config: JSON.stringify(committee()),
    ...overrides
  };
}

/** Removes the proposal and everything stored for it. */
export async function cleanup(id: string): Promise<void> {
  for (const table of [
    'te_aggregate_submissions',
    'te_decryption_shares',
    'te_dkg_submissions',
    'te_results',
    'te_request_nonces'
  ]) {
    await db.queryAsync(`DELETE FROM ${table} WHERE proposal_id = ?`, [id]);
  }
  await db.queryAsync('DELETE FROM votes WHERE proposal = ?', [id]);
  await db.queryAsync('DELETE FROM proposals WHERE id = ?', [id]);
}

/** Replaces any earlier copy of the proposal with a fresh row. */
export async function insertProposal(
  id: string,
  overrides: Record<string, any> = {}
): Promise<void> {
  await cleanup(id);
  await db.queryAsync(
    'INSERT INTO proposals SET ?',
    proposalRow(id, overrides)
  );
}

/** POSTs a body (raw text, or an object to encode) and returns the status. */
export async function postJson(
  id: string,
  route: string,
  body: string | Record<string, any>
): Promise<number> {
  const res = await fetch(`${HOST}/api/proposal/${id}/${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
  return res.status;
}
