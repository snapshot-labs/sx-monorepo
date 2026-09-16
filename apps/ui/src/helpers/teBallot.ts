/**
 * Threshold-ElGamal voter helper for the Snapshot UI.
 *
 * Wraps ``buildBallot`` from ``@shutter-network/urban-verified-crypto`` so that
 * a Vue component only has to provide the user's choice index and the
 * proposal's TE configuration; the helper handles curve init, ephemeral
 * Schnorr key generation, pseudonym derivation, ballot construction and
 * 0x-hex encoding of every byte field.
 *
 * The returned envelope is the exact shape ``apps/sequencer/src/helpers/te.ts``
 * decodes at write time. Both sides are pinned by the SDK's parity gate.
 *
 * Curve init is lazy + idempotent: the first call resolves once the WASM
 * is loaded, every subsequent call returns the cached promise.
 */
import { arrayify, hexlify } from '@ethersproject/bytes';
import { keccak256 } from '@ethersproject/keccak256';
import {
  Attestation,
  BallotVerifyParams,
  buildBallot,
  G1Point,
  initCurves,
  schnorrKeygen
} from '@shutter-network/urban-verified-crypto';
import { BallotCredential, requestBallotCredential } from './teCredential';

let curvesReady: Promise<void> | null = null;

/**
 * The sequencer's credential (hex strings) as the SDK's bytes-and-bigints shape.
 *
 * `nonce` is defaulted rather than required: the issuer always emits it, and a
 * default keeps an older sequencer usable instead of signing over a nonce that
 * differs from the one the committee will order re-votes by.
 */
function toSdkAttestation(c: BallotCredential): Attestation {
  return {
    electionId: arrayify(c.electionId),
    pseudonym: arrayify(c.pseudonym),
    vk: arrayify(c.vk),
    weight: BigInt(c.weight),
    nonce: BigInt(c.nonce ?? 1),
    signature: arrayify(c.signature)
  };
}

/** Idempotent BLST-WASM init; safe to call from page-load and from submit. */
export function ensureCurvesInit(): Promise<void> {
  if (!curvesReady) curvesReady = initCurves();
  return curvesReady as Promise<void>;
}

export interface TeBallotEnvelope {
  electionId: string;
  pseudonym: string;
  vk: string;
  ciphertexts: Array<{ c1: string; c2: string }>;
  zkProof: string;
  voterSignature: string;
  /**
   * The eligibility credential this ballot was cast with.
   *
   * Inside the envelope rather than beside it, because the envelope *is*
   * Snapshot's `choice` — so the outer EIP-712 signature covers it too, and the
   * sequencer reads it from the same signed blob it reads the ballot from.
   *
   * It is also covered by `voterSignature`: since the v2 ballot message the
   * credential is part of what the voter signs, so swapping it invalidates the
   * ballot. There used to be a `wrAttestation` placeholder here and a second
   * signature — `voterAttestationSignature` — doing that job.
   */
  attestation: BallotCredential;
}

function toHex(bytes: Uint8Array): string {
  return hexlify(bytes);
}

/**
 * Pseudonym = keccak256(voter_address || proposal_id). Both sides agree on
 * this construction (see ``apps/sequencer/src/helpers/te.ts``); the
 * sequencer rejects any envelope whose pseudonym does not match.
 */
export function pseudonymFor(voter: string, proposalId: string): Uint8Array {
  const voterBytes = arrayify(voter.toLowerCase());
  const idBytes = arrayify(proposalId);
  const buf = new Uint8Array(voterBytes.length + idBytes.length);
  buf.set(voterBytes, 0);
  buf.set(idBytes, voterBytes.length);
  return arrayify(keccak256(buf));
}

/** What both builders need to obtain a credential before signing. */
export interface CredentialSource {
  /** Sequencer base URL. */
  sequencerUrl: string;
  space: string;
}

export interface BuildTeBallotArgs extends CredentialSource {
  voter: string;
  proposalId: string; // 0x-prefixed bytes32
  mpk: string; // 0x-prefixed compressed G2 (96 bytes)
  config: BallotVerifyParams; // proposal.te_config
  /** 1-based candidate index the user clicked. */
  choice: number;
}

export interface BuildTeWeightedBallotArgs extends CredentialSource {
  voter: string;
  proposalId: string; // 0x-prefixed bytes32
  mpk: string; // 0x-prefixed compressed G2 (96 bytes)
  config: BallotVerifyParams; // proposal.te_config — budget must equal WEIGHTED_BUDGET
  /** Snapshot weighted choice: 1-based candidate index (as string) → weight. */
  choice: Record<string, number>;
}

/**
 * Obtain a credential for this key, then bind the built ballot to it.
 *
 * Ordered deliberately: the credential names `vk`, so the key has to exist
 * before the request, and the binding covers the ballot digest, so the ballot
 * has to exist before the signature. That leaves one network round trip between
 * keygen and ballot construction — and no wallet interaction at all, since the
 * request carries no signature and the binding uses the ballot's ephemeral key.
 */

/**
 * Build the encrypted ballot envelope for a single-choice ballot.
 *
 * Variant A, exact B=1: vote vector is a unit vector of length
 * ``numCandidates`` with a single 1 at ``choice - 1``. The SDK enforces
 * Σvotes == 1 and rejects any vector that does not sum to the budget.
 *
 * The ephemeral Schnorr key ``sk`` lives only inside this function and
 * is dropped on return; per the SDK's coercion-resistance contract the
 * randomness ``r_j`` never leaves ``buildBallot`` either.
 */
export async function buildTeBallotEnvelope(
  args: BuildTeBallotArgs
): Promise<TeBallotEnvelope> {
  const { voter, proposalId, mpk, config, choice, sequencerUrl, space } = args;
  await ensureCurvesInit();

  if (
    config.variant !== 'A' ||
    config.mode !== 'exact' ||
    config.budget !== 1
  ) {
    throw new Error(
      `buildTeBallotEnvelope: only Variant A exact B=1 is supported; got ${JSON.stringify(config)}`
    );
  }
  if (
    !Number.isInteger(choice) ||
    choice < 1 ||
    choice > config.numCandidates
  ) {
    throw new Error(
      `buildTeBallotEnvelope: choice ${choice} out of [1, ${config.numCandidates}]`
    );
  }

  const electionId = arrayify(proposalId);
  const pseudonym = pseudonymFor(voter, proposalId);
  const mpkBytes = arrayify(mpk);

  // Lazy import to keep the SDK G2Point off the import path until the
  // user actually casts a private vote (most spaces won't).
  const { G2Point } = await import('@shutter-network/urban-verified-crypto');
  const mpkPoint = G2Point.fromBytes(mpkBytes);

  const { sk, vk } = schnorrKeygen();
  const vkPoint: G1Point = vk;

  // Before the ballot, because the credential is issued *for* this key and the
  // weight it carries has to be settled before the voter signs anything.
  const issued = await requestBallotCredential({
    sequencerUrl,
    space,
    proposalId,
    vk: toHex(vk.toBytes()),
    voter
  });

  // Unit vector for single-choice exact-B=1.
  const votes: bigint[] = new Array(config.numCandidates).fill(0n);
  votes[choice - 1] = 1n;

  let ballot;
  try {
    ballot = buildBallot({
      mpk: mpkPoint,
      electionId,
      pseudonym,
      sk,
      vk: vkPoint,
      votes,
      params: config,
      // The credential is part of what the voter signs now, so it goes in here
      // rather than being stapled on afterwards with a second signature.
      attestation: toSdkAttestation(issued.attestation)
    });
  } finally {
    mpkPoint.destroyWasm();
    vk.destroyWasm();
  }

  return {
    electionId: toHex(ballot.electionId),
    pseudonym: toHex(ballot.pseudonym),
    vk: toHex(ballot.vk),
    ciphertexts: ballot.ciphertexts.map(([c1, c2]) => ({
      c1: toHex(c1),
      c2: toHex(c2)
    })),
    zkProof: toHex(ballot.zkProof),
    voterSignature: toHex(ballot.voterSignature),
    // Carried *inside* the envelope, which is Snapshot's `choice`, so the outer
    // EIP-712 signature covers them too. The committee reads the credential and
    // the binding from the hub's feed; ingest reads them from here.
    attestation: issued.attestation
  };
}

/**
 * Build an encrypted ballot for a weighted-choice proposal.
 *
 * ``choice`` is the Snapshot weighted format: ``{ "1": 60, "2": 40 }`` where
 * keys are 1-based candidate indices and values are arbitrary positive weights
 * (not required to sum to any fixed number — they are normalised here).
 *
 * The weights are converted to integers summing exactly to ``config.budget``
 * using the largest-remainder method so the SDK's ``Σvotes == budget`` check
 * passes. The tally path in scores.ts divides recovered sums by budget to
 * recover the VP-weighted result.
 */
export async function buildTeWeightedBallotEnvelope(
  args: BuildTeWeightedBallotArgs
): Promise<TeBallotEnvelope> {
  const { voter, proposalId, mpk, config, choice, sequencerUrl, space } = args;
  await ensureCurvesInit();

  if (config.variant !== 'A' || config.mode !== 'exact') {
    throw new Error(
      `buildTeWeightedBallotEnvelope: only Variant A exact is supported; got ${JSON.stringify(config)}`
    );
  }

  const totalWeight = Object.values(choice).reduce((a, b) => a + b, 0);
  if (totalWeight <= 0) {
    throw new Error(
      'buildTeWeightedBallotEnvelope: choice weights sum to zero'
    );
  }

  const budget = config.budget;

  // Largest-remainder method: guarantees Σvotes == budget with minimal rounding error.
  const exact = Array.from({ length: config.numCandidates }, (_, j) => {
    const w = choice[String(j + 1)] ?? 0;
    return (w / totalWeight) * budget;
  });
  const floors = exact.map(Math.floor);
  const remaining = budget - floors.reduce((a, b) => a + b, 0);
  const order = exact
    .map((v, i) => ({ frac: v - Math.floor(v), i }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remaining; k++) floors[order[k].i]++;

  const votes: bigint[] = floors.map(BigInt);

  const electionId = arrayify(proposalId);
  const pseudonym = pseudonymFor(voter, proposalId);
  const mpkBytes = arrayify(mpk);

  const { G2Point } = await import('@shutter-network/urban-verified-crypto');
  const mpkPoint = G2Point.fromBytes(mpkBytes);

  const { sk, vk } = schnorrKeygen();
  const vkPoint: G1Point = vk;

  // Before the ballot, because the credential is issued *for* this key and the
  // weight it carries has to be settled before the voter signs anything.
  const issued = await requestBallotCredential({
    sequencerUrl,
    space,
    proposalId,
    vk: toHex(vk.toBytes()),
    voter
  });

  let ballot;
  try {
    ballot = buildBallot({
      mpk: mpkPoint,
      electionId,
      pseudonym,
      sk,
      vk: vkPoint,
      votes,
      params: config,
      attestation: toSdkAttestation(issued.attestation)
    });
  } finally {
    mpkPoint.destroyWasm();
    vk.destroyWasm();
  }

  return {
    electionId: toHex(ballot.electionId),
    pseudonym: toHex(ballot.pseudonym),
    vk: toHex(ballot.vk),
    ciphertexts: ballot.ciphertexts.map(([c1, c2]) => ({
      c1: toHex(c1),
      c2: toHex(c2)
    })),
    zkProof: toHex(ballot.zkProof),
    voterSignature: toHex(ballot.voterSignature),
    // Carried *inside* the envelope, which is Snapshot's `choice`, so the outer
    // EIP-712 signature covers them too. The committee reads the credential and
    // the binding from the hub's feed; ingest reads them from here.
    attestation: issued.attestation
  };
}
