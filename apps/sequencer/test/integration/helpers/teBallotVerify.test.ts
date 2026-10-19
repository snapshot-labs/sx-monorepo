/**
 * Private ballot verification with real crypto.
 *
 * `verifyBallot` runs seconds of synchronous WASM per ballot (about 7 s at three
 * choices and budget 100), so it runs in a worker pool, off the main thread.
 * Ingest checks the credential with it too: the issuer's signature authorises
 * the weight, and the voter's ballot signature ties the credential to this
 * ballot. Both are needed.
 */

import { G2Point } from '@shutter-network/urban-verified-crypto';
import {
  eligibilityPublicKey,
  resetIssuer
} from '../../../src/helpers/sgpAttestation';
import {
  ensureCurvesInit,
  expectedPseudonym,
  verifyTeBallot
} from '../../../src/helpers/te';
import { closeBallotPool } from '../../../src/helpers/teBallotPool';
import { castBallot, CastBallotArgs } from '../../fixtures/teBallotBuilder';

const ID = `0x${'5e'.repeat(32)}`;
const VOTER = '0x00000000000000000000000000000000000000b1';
const NUM_CANDIDATES = 3;
/** Large enough that a check takes long enough to measure the main thread. */
const POOL_BUDGET = 30;
/** Small, so the credential checks stay fast. */
const CREDENTIAL_BUDGET = 3;

let mpk: string;
let eligibilityKey: string;

beforeAll(async () => {
  jest.useRealTimers();
  process.env.TE_ELIGIBILITY_PRIVATE_KEY = `0x${'00'.repeat(30)}2a2a`;
  resetIssuer();
  await ensureCurvesInit();
  const g = G2Point.generator();
  mpk = `0x${Buffer.from(g.toBytes()).toString('hex')}`;
  g.destroyWasm();
  eligibilityKey = await eligibilityPublicKey();
}, 60_000);

afterAll(() => closeBallotPool());

function ballot(over: Partial<CastBallotArgs> = {}) {
  return castBallot({
    electionId: ID,
    pseudonym: expectedPseudonym(VOTER, ID),
    nonce: 1,
    numCandidates: NUM_CANDIDATES,
    ...over
  });
}

function verify(
  envelope: Record<string, unknown>,
  attestation: unknown,
  budget: number
) {
  return verifyTeBallot(
    {
      id: ID,
      te_mpk: mpk,
      te_config: {
        numCandidates: NUM_CANDIDATES,
        budget,
        mode: 'exact',
        variant: 'A'
      }
    },
    VOTER,
    JSON.stringify({ ...envelope, attestation }),
    eligibilityKey
  );
}

describe('private ballot verification: the worker pool', () => {
  async function poolBallot() {
    const { envelope, attestation } = await ballot({ budget: POOL_BUDGET });
    return { ...envelope, attestation };
  }
  const check = (choice: Record<string, unknown>) =>
    verify(choice, choice.attestation, POOL_BUDGET);

  it('keeps the main thread free while a ballot is checked', async () => {
    const choice = await poolBallot();
    let ticks = 0;
    const timer = setInterval(() => ticks++, 10);
    const started = Date.now();
    const result = await check(choice);
    const elapsed = Date.now() - started;
    clearInterval(timer);

    expect(result.ok).toBe(true);
    // A free main thread fires the timer about every 10 ms; a blocked one does
    // not. Half that rate allows for a busy machine.
    expect(elapsed).toBeGreaterThan(200);
    expect(ticks).toBeGreaterThan(elapsed / 10 / 2);
  }, 120_000);

  it('checks several ballots at once, each against its own bytes', async () => {
    const good = await poolBallot();
    const tampered = { ...(await poolBallot()), zkProof: good.zkProof };
    const results = await Promise.all([
      check(good),
      check(tampered),
      check(good)
    ]);
    expect(results.map(r => r.ok)).toEqual([true, false, true]);
  }, 120_000);
});

describe('private ballot verification: the credential is checked, not minted', () => {
  const credentialBallot = (over: Partial<CastBallotArgs> = {}) =>
    ballot({ weight: 5, budget: CREDENTIAL_BUDGET, ...over });

  // A credential moved from the voter's later ballot onto an earlier one would let
  // whoever assembles the ballots pick which one the committee counts.
  it("refuses a credential moved from the voter's other ballot", async () => {
    const first = await credentialBallot({ nonce: 1 });
    const second = await credentialBallot({ nonce: 2 });
    const result = await verify(
      first.envelope,
      second.attestation,
      CREDENTIAL_BUDGET
    );
    expect(result.ok).toBe(false);
  }, 60_000);

  it('refuses a weight the voter never signed', async () => {
    const b = await credentialBallot();
    const forged = { ...b.attestation, weight: 50 };
    const result = await verify(b.envelope, forged, CREDENTIAL_BUDGET);
    expect(result.ok).toBe(false);
  }, 60_000);
});
