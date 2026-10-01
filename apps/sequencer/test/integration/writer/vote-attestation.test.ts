/**
 * The eligibility credential is written with the vote, on the same row.
 *
 * These assertions are the reason the credential is three columns on `votes`
 * rather than a side table. A separate table keyed on the vote id would have
 * needed an explicit delete-by-previous-id on re-vote, and a second write that
 * could fail independently of the first — leaving a vote whose credential is
 * missing, which the hub's ballot feed refuses to serve, which stalls the whole
 * tally. Columns make both impossible, and these tests are what hold that.
 */

import {
  G1Point,
  initCurves,
  schnorrVerify
} from '@shutter-network/urban-verified-crypto';
import {
  attestationMessage,
  eligibilityPublicKey,
  mintAttestation,
  resetIssuer
} from '../../../src/helpers/gegAttestation';
import { verifyBallotSignature } from '../../../src/helpers/gegBinding';
import db, { sequencerDB } from '../../../src/helpers/mysql';
import { pseudonymFor } from '../../../src/helpers/teAttestationIssuer';
import * as scores from '../../../src/scores';
import { action, verifyBallotCredential } from '../../../src/writer/vote';
import { castBallot, CastBallotArgs } from '../../fixtures/teBallotBuilder';

const SPACE = 'test.eth';
// Deliberately not the address other suites use as a proposal author. `action()`
// upserts a `leaderboard` row for the voter, and `delete-proposal` decrements
// `proposal_count` on that same row — from zero, if this suite created it, which
// underflows an unsigned column and fails a test in a different file.
const VOTER = '0x000000000000000000000000000000000A77E571';
const ISSUER_SK =
  '0x0000000000000000000000000000000000000000000000000000000000002a2a';

// action() finalises by recomputing scores, which for a public proposal reaches
// the score API. Stubbed so these tests exercise the write and nothing else.
jest.spyOn(scores, 'updateProposalAndVotes').mockResolvedValue(true);

function bytes(hex: string): Uint8Array {
  return new Uint8Array(
    Buffer.from(hex.startsWith('0x') ? hex.slice(2) : hex, 'hex')
  );
}

const PSEUDONYM = `0x${'22'.repeat(32)}`;
const VK = `0x${'ab'.repeat(48)}`;

function envelope() {
  return {
    electionId: `0x${'11'.repeat(32)}`,
    pseudonym: PSEUDONYM,
    vk: VK,
    ciphertexts: [],
    zkProof: '0x',
    voterSignature: `0x${'00'.repeat(80)}`,
    wrAttestation: '0x'
  };
}

function body(
  proposalId: string,
  timestamp: number,
  credentialEnvelope?: Record<string, unknown>
) {
  return {
    address: VOTER,
    msg: JSON.stringify({
      space: SPACE,
      timestamp: String(timestamp),
      payload: {
        proposal: proposalId,
        // The credential rides inside `choice`, because that is what the voter
        // signed. `action()` stores the blob verbatim and inspects nothing.
        choice: credentialEnvelope
          ? { ...envelope(), ...credentialEnvelope }
          : envelope(),
        metadata: {},
        app: '',
        reason: ''
      }
    })
  };
}

function context(attestation: any) {
  return {
    proposal: { id: 'unused', strategies: [] },
    vp: { vp: 42, vp_by_strategy: [42], vp_state: 'final' },
    attestation
  };
}

async function seedProposal(id: string, privacy: string) {
  await db.queryAsync('DELETE FROM proposals WHERE id = ?', [id]);
  await db.queryAsync('INSERT INTO proposals SET ?', {
    id,
    ipfs: `bafkrei${id.slice(-12)}`,
    author: VOTER,
    created: 1,
    space: SPACE,
    network: '1',
    symbol: '',
    type: 'weighted',
    strategies: '[]',
    validation: '{}',
    plugins: '{}',
    title: 'attestation fixture',
    body: '',
    discussion: '',
    choices: JSON.stringify(['A', 'B']),
    start: 1,
    end: 2_000_000_000,
    quorum: 0,
    privacy,
    snapshot: 1,
    app: '',
    scores: '[]',
    scores_by_strategy: '[]',
    scores_state: 'pending',
    scores_total: 0,
    scores_updated: 0,
    vp_value_by_strategy: '[]',
    votes: 0
  });
}

async function voteRow(proposalId: string): Promise<any> {
  const rows = await db.queryAsync(
    'SELECT id, created, choice FROM votes WHERE proposal = ? AND voter = ?',
    [proposalId, VOTER]
  );
  if (!rows[0]) return undefined;
  const choice =
    typeof rows[0].choice === 'string'
      ? JSON.parse(rows[0].choice)
      : rows[0].choice;
  return { ...rows[0], choice, credential: choice?.attestation };
}

describe('vote: the credential is written with the vote', () => {
  let issuerKey: string;

  beforeAll(async () => {
    process.env.TE_ELIGIBILITY_PRIVATE_KEY = ISSUER_SK;
    resetIssuer();
    issuerKey = await eligibilityPublicKey();
    await initCurves();
  });

  afterAll(async () => {
    await db.queryAsync('DELETE FROM votes WHERE space = ?', [SPACE]);
    await db.queryAsync('DELETE FROM proposals WHERE space = ?', [SPACE]);
    // `action()` upserts a leaderboard row; leaving it behind changes the
    // starting state for any suite that decrements those counters.
    await db.queryAsync(
      'DELETE FROM leaderboard WHERE space = ? AND user = ?',
      [SPACE, VOTER]
    );
    await db.endAsync();
    await sequencerDB.endAsync();
  });

  beforeEach(async () => {
    await db.queryAsync('DELETE FROM votes WHERE space = ?', [SPACE]);
  });

  async function credential(proposalId: string, weight: bigint, nonce: bigint) {
    const signature = await mintAttestation({
      electionId: proposalId,
      pseudonym: PSEUDONYM,
      vk: VK,
      weight,
      nonce
    });
    return {
      weight: Number(weight),
      nonce: Number(nonce),
      signature,
      // Opaque to `action()` — it writes the column, it does not check it. The
      // check is `verify()`'s, and `geg-binding-verify.test.ts` covers the crypto.
      bindingSignature: `0x${'be'.repeat(80)}`
    };
  }

  /** The credential as it rides inside `choice`, signed by the issuer. */
  async function credentialEnvelope(id: string, weight: bigint, nonce: bigint) {
    const att = await credential(id, weight, nonce);
    return {
      attestation: {
        scheme: 'ATTESTATION_V1',
        electionId: id,
        pseudonym: PSEUDONYM,
        vk: VK,
        weight: att.weight,
        nonce: att.nonce,
        signature: att.signature
      }
    };
  }

  it('stores the credential verbatim, inside the signed blob', async () => {
    const id = `0x${'a1'.repeat(32)}`;
    await seedProposal(id, 'shutter-elgamal');
    const nonce = 4;
    const carried = await credentialEnvelope(id, 7n, BigInt(nonce));

    await action(
      body(id, 1_700_000_000, carried),
      'ipfs1',
      {},
      '0xvote1',
      context(await credential(id, 7n, BigInt(nonce)))
    );

    const row = await voteRow(id);
    // Verbatim: `action()` stores what the voter signed and derives nothing from
    // it. A column copy would be a second source for bytes the committee checks
    // a signature over.
    expect(row.credential).toEqual(carried.attestation);
    // And in the signed blob itself, which is what the committee reads.
    expect(row.choice.attestation).toEqual(carried.attestation);

    // And the stored bytes are a credential the committee would accept, not
    // merely a string that round-tripped through the database.
    const issuer = G1Point.fromBytes(bytes(issuerKey));
    const sig = bytes(row.credential.signature);
    const R = G1Point.fromBytes(sig.subarray(0, 48));
    let sc = 0n;
    for (const b of sig.subarray(48)) sc = (sc << 8n) | BigInt(b);
    const message = attestationMessage(
      bytes(id),
      bytes(PSEUDONYM),
      bytes(VK),
      BigInt(row.credential.weight),
      BigInt(row.credential.nonce)
    );
    expect(schnorrVerify(issuer, message, { R, s: sc })).toBe(true);
    issuer.destroyWasm();
    R.destroyWasm();
  });

  // A re-vote overwrites the row, so the credential goes with the ballot it
  // belongs to. Keeping them in one blob is why a re-vote cannot leave a stale
  // credential attached to a ballot that no longer exists.
  it('replaces the credential on a re-vote, carrying the new nonce', async () => {
    const id = `0x${'a2'.repeat(32)}`;
    await seedProposal(id, 'shutter-elgamal');

    await action(
      body(id, 1_700_000_000, await credentialEnvelope(id, 3n, 1n)),
      'ipfs1',
      {},
      '0xvote1',
      context(await credential(id, 3n, 1n))
    );

    const second = 1_700_000_060;
    await action(
      body(id, second, await credentialEnvelope(id, 9n, 2n)),
      'ipfs2',
      {},
      '0xvote2',
      context(await credential(id, 9n, 2n))
    );

    const rows = await db.queryAsync(
      'SELECT id, created FROM votes WHERE proposal = ? AND voter = ?',
      [id, VOTER]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('0xvote2');
    expect(rows[0].created).toBe(second);

    const row = await voteRow(id);
    // The later credential, with the higher nonce — the counter the issuer
    // allocated, not the vote's timestamp.
    expect(row.credential.nonce).toBe(2);
    expect(row.credential.weight).toBe(9);
  });

  // A quoted number is the L-5 failure class in a new place. `BigInt("10000")`
  // works and `bindingMessage` coerces too, so a string weight verifies here and
  // is then rejected by every keyper — geg's decoder requires a real integer.
  // The columns used to launder this, because MySQL normalised it on the way in;
  // with the credential served straight from `choice`, ingest has to refuse it.
  it.each([
    ['a quoted weight', { weight: '7' }],
    ['a quoted nonce', { nonce: '4' }],
    ['a fractional weight', { weight: 7.5 }]
  ])('refuses %s rather than coercing it', async (_label, over) => {
    const id = `0x${'a5'.repeat(32)}`;
    const carried = await credentialEnvelope(id, 7n, 4n);
    const msg = {
      payload: {
        choice: {
          ...envelope(),
          ...carried,
          attestation: { ...carried.attestation, ...over }
        }
      }
    };
    await expect(
      verifyBallotCredential(
        { id, te_config: { numCandidates: 2, budget: 1 } },
        msg
      )
    ).rejects.toThrow(/must be an integer/);
  });

  it('stores a plain choice on a public proposal', async () => {
    const id = `0x${'a4'.repeat(32)}`;
    await seedProposal(id, '');
    await action(
      body(id, 1_700_000_000),
      'ipfs1',
      {},
      '0xvote1',
      // verify() attaches no credential for a public proposal.
      { ...context(null), attestation: null }
    );
    const row = await voteRow(id);
    // Nothing credential-shaped on a public ballot: the envelope carries none,
    // and there are no columns left that could hold one.
    expect(row.credential).toBeUndefined();
    expect(row.choice.attestation).toBeUndefined();
  });
});

/**
 * The wiring: that `verify()` mints at all, clamps to the ceiling, and does
 * neither for a public proposal.
 *
 * `verifyTeBallot` and `getVp` are stubbed. The ballot crypto and the score
 * lookup are not what is under test here — both are covered elsewhere — and
 * building a real encrypted ballot to reach the minting code would test the SDK
 * rather than this branch.
 */
/**
 * `verify()` no longer mints — it checks what the voter presented.
 *
 * The clamp, the dust floor and the nonce moved to `/te_attestation`, where they
 * are applied *before* the voter signs (see `teAttestationIssuer.test.ts`). What
 * is left here is the ingest contract: a ballot is accepted only when the
 * issuer's signature authorises the weight **and** the voter's ballot signature ties that
 * credential to this ballot. Either alone leaves the pairing forgeable by
 * whoever assembles it.
 */
describe('vote verify(): the credential is checked, not minted', () => {
  const ID = `0x${'d1'.repeat(32)}`;
  const PSEUDO_FOR = (voter: string) => pseudonymFor(voter, ID);

  beforeAll(async () => {
    process.env.TE_ELIGIBILITY_PRIVATE_KEY = ISSUER_SK;
    resetIssuer();
    await initCurves();
    await eligibilityPublicKey();
  }, 60_000);

  async function ballotFor(over: Partial<CastBallotArgs> = {}) {
    return castBallot({
      electionId: ID,
      pseudonym: PSEUDO_FOR(VOTER),
      nonce: 1,
      weight: 5,
      ...over
    });
  }

  it('accepts a ballot whose signature covers its credential', async () => {
    const b = await ballotFor();
    await expect(
      verifyBallotSignature({
        envelope: b.envelope,
        attestation: b.attestation
      })
    ).resolves.toBe(true);
  }, 60_000);

  // The substitution this check exists to stop: a credential lifted from the
  // voter's own later ballot onto their earlier one, which is how an assembler
  // would choose which of their ballots the committee counts. Caught by the
  // ballot's own signature now that the credential is inside what it covers.
  it("refuses a credential moved from the voter's other ballot", async () => {
    const first = await ballotFor({ nonce: 1 });
    const second = await ballotFor({ nonce: 2 });
    await expect(
      verifyBallotSignature({
        envelope: first.envelope,
        attestation: second.attestation
      })
    ).resolves.toBe(false);
  }, 60_000);

  // A ballot signed over a credential it does not ship with — the forgery built
  // the way an attacker would build it, not by corrupting bytes afterwards.
  it('refuses a ballot signed over a different credential', async () => {
    const other = await ballotFor({ nonce: 9, weight: 9 });
    const b = await ballotFor({ bindTo: other.attestation });
    await expect(
      verifyBallotSignature({
        envelope: b.envelope,
        attestation: b.attestation
      })
    ).resolves.toBe(false);
  }, 60_000);

  it('refuses a weight the voter never signed', async () => {
    const b = await ballotFor();
    await expect(
      verifyBallotSignature({
        envelope: b.envelope,
        attestation: { ...b.attestation, weight: 50 }
      })
    ).resolves.toBe(false);
  }, 60_000);
});
