import { Wallet } from '@ethersproject/wallet';
import snapshot from '@snapshot-labs/snapshot.js';
import db, { sequencerDB } from '../../../src/helpers/mysql';
import { resetIssuer } from '../../../src/helpers/sgpAttestation';
import { expectedPseudonym } from '../../../src/helpers/te';
import * as issuer from '../../../src/helpers/teAttestationIssuer';
import { insertProposal } from '../../fixtures/proposal';

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
  await db.queryAsync('DELETE FROM te_revote_nonces WHERE proposal_id = ?', [
    ID
  ]);
  await insertProposal({
    id: ID,
    author: VOTER.address,
    type: 'weighted',
    choices: JSON.stringify(['A', 'B', 'C']),
    start: now - 60,
    end: now + 3600,
    privacy: 'shutter-elgamal',
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

// `resetIssuer` clears the cached key so this one is used.
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
  // The pseudonym is derived from the voter address and never taken from the
  // request.
  it('issues a credential the voter can verify, with a derived pseudonym', async () => {
    const r = await request();
    expect(r.attestation.scheme).toBe('ATTESTATION_V1');
    expect(r.attestation.electionId).toBe(ID);
    expect(r.attestation.vk).toBe(VK);
    expect(r.attestation.weight).toBe(5);
    expect(r.attestation.signature).toMatch(/^0x[0-9a-f]{160}$/);
    expect(r.attestation.pseudonym).toBe(expectedPseudonym(VOTER.address, ID));
  });

  // The endpoint is unauthenticated on purpose. Ingest derives the pseudonym from
  // the EIP-712 signer, so a credential only works for the voter named in it.
  it('binds the credential to the named voter, not to the caller', async () => {
    const other = new Wallet(`0x${'d0'.repeat(32)}`);
    const r = await request({ voter: other.address });
    expect(r.attestation.pseudonym).toBe(expectedPseudonym(other.address, ID));
    expect(r.attestation.pseudonym).not.toBe(
      expectedPseudonym(VOTER.address, ID)
    );
  });
});

describe('issueBallotCredential — the weight rules, applied before signing', () => {
  // Voting power is not capped: the scale factor keeps the tally solvable.
  // From 1e21 a JSON number is written as `1e+21`, which keypers read as a float
  // and drop, and above 2^53 it is not exact. Power that rounds to zero is
  // refused before the voter signs.
  it.each([
    ['far above the old 1e6 ceiling, uncapped', 25_000_000, 25_000_000],
    [
      'the largest exact integer',
      Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER
    ],
    ['fractional, rounded', 2.6, 3],
    ['too large to carry exactly', 1e21, { status: 422 }],
    ['dust', 0.4, { status: 403 }],
    ['zero', 0, { status: 403 }]
  ])('voting power %s', async (_label, vp, expected) => {
    setVp(vp);
    if (typeof expected === 'number') {
      const r = await request();
      expect(r.attestation.weight).toBe(expected);
      // An uncapped weight is the voting power itself.
      if (expected === vp) expect(r.votingPower).toBe(vp);
    } else {
      expect(await status(request())).toBe(expected.status);
    }
  });
});

describe('nextRevoteNonce', () => {
  // The committee ranks a voter's ballots by (nonce, sequenceNumber), so this
  // counter decides which one is counted.
  it('increases with each credential for the same voter', async () => {
    expect((await request()).attestation.nonce).toBe(1);
    expect((await request()).attestation.nonce).toBe(2);
    expect((await request()).attestation.nonce).toBe(3);
  });

  it('counts separately per voter', async () => {
    await request();
    await request();
    const other = new Wallet(`0x${'c9'.repeat(32)}`);
    const r = await request({ voter: other.address });
    expect(r.attestation.nonce).toBe(1);
  });

  // The LAST_INSERT_ID upsert must give concurrent requests different nonces, or
  // the re-vote order would be undefined.
  it('never hands the same nonce to concurrent requests', async () => {
    const pseudonym = expectedPseudonym(VOTER.address, ID);
    const nonces = await Promise.all(
      Array.from({ length: 8 }, () => issuer.nextRevoteNonce(ID, pseudonym))
    );
    expect(new Set(nonces).size).toBe(8);
  });
});

describe('issueBallotCredential — refusals', () => {
  it.each([
    ['a malformed proposal id', { proposalId: '0x1234' }],
    ['a malformed vk', { vk: '0xdeadbeef' }],
    ['a missing space', { space: '' }],
    ['a malformed voter', { voter: '0xnope' }]
  ])('refuses %s with 400', async (_label, over) => {
    expect(await status(request(over))).toBe(400);
  });

  it('refuses an unknown proposal with 404', async () => {
    expect(await status(request({ space: 'nope.eth' }))).toBe(404);
  });

  // The closed window is the same check ingest applies, so no credential is
  // issued for a ballot that would be refused.
  it.each([
    ['a public proposal', { privacy: '' }, 404],
    ['a proposal whose committee has no key yet', { te_mpk: null }, 409],
    [
      'a proposal whose voting has closed',
      {
        start: Math.floor(Date.now() / 1e3) - 7200,
        end: Math.floor(Date.now() / 1e3) - 3600
      },
      422
    ]
  ])('refuses %s', async (_label, over, expected) => {
    await seed(over);
    expect(await status(request())).toBe(expected);
  });
});
