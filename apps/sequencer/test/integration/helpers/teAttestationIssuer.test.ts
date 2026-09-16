import { Wallet } from '@ethersproject/wallet';
import snapshot from '@snapshot-labs/snapshot.js';
import { resetIssuer } from '../../../src/helpers/gegAttestation';
import db, { sequencerDB } from '../../../src/helpers/mysql';
import * as issuer from '../../../src/helpers/teAttestationIssuer';

function setVp(vp: number) {
  jest
    .spyOn(snapshot.utils, 'getVp')
    .mockResolvedValue({ vp, vp_by_strategy: [vp] } as any);
}

const VOTER = new Wallet(`0x${'a7'.repeat(32)}`);
const SPACE = 'test.eth';
const ID = `0x${'f1'.repeat(32)}`;
const VK = `0x${'33'.repeat(48)}`;
const BUDGET = 100;

async function seed(over: Record<string, unknown> = {}): Promise<void> {
  const now = Math.floor(Date.now() / 1e3);
  await db.queryAsync('DELETE FROM proposals WHERE id = ?', [ID]);
  await db.queryAsync('DELETE FROM te_revote_nonces WHERE proposal_id = ?', [
    ID
  ]);
  await db.queryAsync('INSERT INTO proposals SET ?', {
    id: ID,
    ipfs: 'bafkreiissuer',
    author: VOTER.address,
    created: 1,
    space: SPACE,
    network: '1',
    symbol: '',
    type: 'weighted',
    strategies: '[]',
    validation: '{}',
    plugins: '{}',
    title: 'issuer fixture',
    body: '',
    discussion: '',
    choices: JSON.stringify(['A', 'B', 'C']),
    start: now - 60,
    end: now + 3600,
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
    te_mpk: Buffer.alloc(96, 0xab),
    te_config: JSON.stringify({
      numCandidates: 3,
      budget: BUDGET,
      mode: 'exact',
      variant: 'A'
    }),
    ...over
  });
}

async function request(over: Record<string, unknown> = {}) {
  return issuer.issueBallotCredential({
    space: SPACE,
    proposalId: ID,
    vk: VK,
    voter: VOTER.address,
    ...over
  } as any);
}

const status = async (p: Promise<unknown>) =>
  p.then(
    () => 0,
    (e: any) => e.status
  );

// The issuing key, as an operator would configure it. `resetIssuer` clears the
// cached key so the value set here is the one actually used.
const ISSUER_SK = `0x${'11'.repeat(32)}`;

beforeAll(() => {
  process.env.TE_ELIGIBILITY_PRIVATE_KEY = ISSUER_SK;
  resetIssuer();
});

beforeEach(async () => {
  setVp(5);
  await seed();
});

afterAll(async () => {
  await db.queryAsync('DELETE FROM proposals WHERE id = ?', [ID]);
  await db.queryAsync('DELETE FROM te_revote_nonces WHERE proposal_id = ?', [
    ID
  ]);
  await db.endAsync();
  await sequencerDB.endAsync();
});

describe('issueBallotCredential', () => {
  it('issues a credential the voter can verify', async () => {
    const r = await request();
    expect(r.attestation.scheme).toBe('ATTESTATION_V1');
    expect(r.attestation.electionId).toBe(ID);
    expect(r.attestation.vk).toBe(VK);
    expect(r.attestation.weight).toBe(5);
    expect(r.attestation.signature).toMatch(/^0x[0-9a-f]{160}$/);
  });

  // The pseudonym follows from the named address alone; it is never accepted as
  // a request field, so it cannot be pointed at an unrelated voter.
  it('derives the pseudonym rather than accepting one', async () => {
    const r = await request();
    expect(r.attestation.pseudonym).toBe(
      issuer.pseudonymFor(VOTER.address, ID)
    );
  });

  it('gives a different voter a different pseudonym', async () => {
    const other = new Wallet(`0x${'b8'.repeat(32)}`);
    const r = await issuer.issueBallotCredential({
      space: SPACE,
      proposalId: ID,
      vk: VK,
      voter: other.address
    });
    expect(r.attestation.pseudonym).not.toBe(
      issuer.pseudonymFor(VOTER.address, ID)
    );
  });
});

describe('issueBallotCredential — the weight rules, applied before signing', () => {
  // The inverse of what this once asserted. It used to expect `weight === 10_000`
  // for a 999,999 holder -- `maxWeight = floor(1e6 / budget)` -- which flattened the
  // top of every cap table it touched: a holder of 25,000 and one of 25,000,000
  // voted identically. There is no cap now; keeping the tally computable is the
  // scale factor's job, and scaling divides everyone rather than truncating some.
  it('carries voting power as held, with no cap', async () => {
    setVp(999_999);
    const r = await request();
    expect(r.attestation.weight).toBe(999_999);
    expect(r.votingPower).toBe(999_999);
  });

  // A figure far above the old 1e6 ceiling, to pin that nothing clamps at any
  // magnitude rather than that one particular cap was raised.
  it('does not cap even far above the old 1e6 ceiling', async () => {
    setVp(25_000_000);
    const r = await request();
    expect(r.attestation.weight).toBe(25_000_000);
    expect(r.votingPower).toBe(25_000_000);
  });

  it('rounds fractional voting power', async () => {
    setVp(2.6);
    expect((await request()).attestation.weight).toBe(3);
  });

  // Dust moves here from ingest: a ballot that would round to zero must be
  // refused before the voter signs, not after.
  it('refuses dust', async () => {
    setVp(0.4);
    expect(await status(request())).toBe(403);
  });

  it('refuses zero voting power', async () => {
    setVp(0);
    expect(await status(request())).toBe(403);
  });
});

describe('nextRevoteNonce', () => {
  // The committee ranks a voter's duplicate ballots by (nonce, sequenceNumber),
  // so this counter is what decides which of their ballots is counted.
  it('increases with each credential for the same voter', async () => {
    expect((await request()).attestation.nonce).toBe(1);
    expect((await request()).attestation.nonce).toBe(2);
    expect((await request()).attestation.nonce).toBe(3);
  });

  it('counts separately per voter', async () => {
    await request();
    await request();
    const other = new Wallet(`0x${'c9'.repeat(32)}`);
    const r = await issuer.issueBallotCredential({
      space: SPACE,
      proposalId: ID,
      vk: VK,
      voter: other.address
    });
    expect(r.attestation.nonce).toBe(1);
  });

  // Concurrency is the whole reason for the LAST_INSERT_ID upsert: two requests
  // handed the same nonce would leave the re-vote ordering undefined.
  it('never hands the same nonce to concurrent requests', async () => {
    const pseudonym = issuer.pseudonymFor(VOTER.address, ID);
    const nonces = await Promise.all(
      Array.from({ length: 8 }, () => issuer.nextRevoteNonce(ID, pseudonym))
    );
    expect(new Set(nonces).size).toBe(8);
  });

  it('does not regress across a restart', async () => {
    const pseudonym = issuer.pseudonymFor(VOTER.address, ID);
    await issuer.nextRevoteNonce(ID, pseudonym);
    await issuer.nextRevoteNonce(ID, pseudonym);
    // The counter lives in the database, not in process memory — nothing to
    // reset, which is the property. Read it back the way a fresh process would.
    const [row] = await db.queryAsync(
      'SELECT last FROM te_revote_nonces WHERE proposal_id = ? AND pseudonym = ?',
      [ID, pseudonym]
    );
    expect(Number(row.last)).toBe(2);
    expect(await issuer.nextRevoteNonce(ID, pseudonym)).toBe(3);
  });
});

describe('issueBallotCredential — refusals', () => {
  // The endpoint is deliberately unauthenticated — see the module header. What
  // keeps a credential useless to anyone but its named voter is not this route
  // but ingest, which derives the pseudonym from the EIP-712-authenticated
  // address. So the property to pin here is that the pseudonym follows the named
  // voter and nothing else.
  it('binds the credential to the named voter, not to the caller', async () => {
    const other = new Wallet(`0x${'d0'.repeat(32)}`);
    const r = await request({ voter: other.address });
    expect(r.attestation.pseudonym).toBe(
      issuer.pseudonymFor(other.address, ID)
    );
    expect(r.attestation.pseudonym).not.toBe(
      issuer.pseudonymFor(VOTER.address, ID)
    );
  });

  it.each([
    ['a malformed proposal id', { proposalId: '0x1234' }],
    ['a malformed vk', { vk: '0xdeadbeef' }],
    ['a missing space', { space: '' }],
    ['a malformed voter', { voter: '0xnope' }],
    ['a missing voter', { voter: undefined }]
  ])('refuses %s with 400', async (_label, over) => {
    expect(await status(request(over))).toBe(400);
  });

  it('refuses an unknown proposal with 404', async () => {
    expect(await status(request({ space: 'nope.eth' }))).toBe(404);
  });

  it('refuses a public proposal with 404', async () => {
    await seed({ privacy: '' });
    expect(await status(request())).toBe(404);
  });

  it('refuses before the committee has a key, with 409', async () => {
    await seed({ te_mpk: null });
    expect(await status(request())).toBe(409);
  });

  // The same half-open window ingest enforces, so a credential is never issued
  // for a ballot that would be refused the moment it is cast.
  it('refuses once voting has closed, with 422', async () => {
    const now = Math.floor(Date.now() / 1e3);
    await seed({ start: now - 7200, end: now - 3600 });
    expect(await status(request())).toBe(422);
  });

  it('refuses before voting opens, with 422', async () => {
    const now = Math.floor(Date.now() / 1e3);
    await seed({ start: now + 3600, end: now + 7200 });
    expect(await status(request())).toBe(422);
  });
});
