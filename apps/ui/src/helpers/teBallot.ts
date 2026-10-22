/**
 * Builds the encrypted ballot for a private (shutter-elgamal) vote.
 *
 * Requests a credential from the sequencer, then uses the SDK's `buildBallot` to
 * encrypt, prove and sign the vote, in a Web Worker (`teBallotWorker.ts`). The
 * result is sent as the vote's `choice`; the sequencer decodes it in
 * `apps/sequencer/src/helpers/te.ts`.
 */
import { arrayify, hexlify } from '@ethersproject/bytes';
import { keccak256 } from '@ethersproject/keccak256';
import {
  Attestation,
  BallotInputs,
  BallotVerifyParams,
  buildBallot,
  G2Point,
  initCurves,
  schnorrKeygen
} from '@shutter-network/urban-verified-crypto';
import { BallotCredential, requestBallotCredential } from './teCredential';

let curvesReady: Promise<void> | null = null;

/** Converts the sequencer's credential (hex strings) to the SDK's format. */
function toSdkAttestation(c: BallotCredential): Attestation {
  return {
    electionId: arrayify(c.electionId),
    pseudonym: arrayify(c.pseudonym),
    vk: arrayify(c.vk),
    weight: BigInt(c.weight),
    nonce: BigInt(c.nonce),
    signature: arrayify(c.signature)
  };
}

/**
 * Loads the BLST WASM once. A failed load is not cached, so the next vote tries
 * again instead of failing until the page is reloaded.
 */
export function ensureCurvesInit(): Promise<void> {
  if (!curvesReady) {
    curvesReady = initCurves().catch(err => {
      curvesReady = null;
      throw err;
    });
  }
  return curvesReady as Promise<void>;
}

/** What building a ballot needs. All of it passes to a worker unchanged. */
export interface BallotBuildRequest {
  mpk: Uint8Array;
  electionId: Uint8Array;
  pseudonym: Uint8Array;
  /** The voter's one-time secret key; `vk` is derived from it again. */
  sk: bigint;
  votes: bigint[];
  params: BallotVerifyParams;
  attestation: Attestation;
}

export type BallotWorkerMessage =
  | { type: 'done'; ballot: BallotInputs }
  | { type: 'error'; message: string };

/** Runs the SDK's `buildBallot`, in the ballot worker or, without one, here. */
export async function buildBallotFromRequest(
  req: BallotBuildRequest
): Promise<BallotInputs> {
  await ensureCurvesInit();
  const mpk = G2Point.fromBytes(req.mpk);
  const { vk } = schnorrKeygen(req.sk);
  try {
    return buildBallot({
      mpk,
      electionId: req.electionId,
      pseudonym: req.pseudonym,
      sk: req.sk,
      vk,
      votes: req.votes,
      params: req.params,
      // Part of what the voter signs.
      attestation: req.attestation
    });
  } finally {
    mpk.destroyWasm();
    vk.destroyWasm();
  }
}

/**
 * Builds the ballot in a Web Worker, because a weighted ballot takes seconds to
 * tens of seconds and would freeze the page. Without `Worker` (tests), it runs
 * on this thread.
 */
function buildBallotInWorker(req: BallotBuildRequest): Promise<BallotInputs> {
  if (typeof Worker === 'undefined') return buildBallotFromRequest(req);

  // `type: 'module'`, and built as one (`worker.format` in vite.config.ts).
  const worker = new Worker(new URL('./teBallotWorker.ts', import.meta.url), {
    type: 'module'
  });
  return new Promise<BallotInputs>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<BallotWorkerMessage>) => {
      worker.terminate();
      const msg = event.data;
      if (msg.type === 'done') resolve(msg.ballot);
      else reject(new Error(msg.message));
    };
    worker.onerror = err => {
      worker.terminate();
      reject(new Error(err.message || 'ballot worker failed'));
    };
    worker.postMessage(req);
  });
}

export interface TeBallotEnvelope {
  electionId: string;
  pseudonym: string;
  vk: string;
  ciphertexts: Array<{ c1: string; c2: string }>;
  zkProof: string;
  voterSignature: string;
  /**
   * The eligibility credential. `voterSignature` covers it, and so does the
   * EIP-712 vote signature, because the envelope is sent as the vote's `choice`.
   */
  attestation: BallotCredential;
}

/**
 * keccak256(voter address ‖ proposal id). Must match `expectedPseudonym` in the
 * sequencer, which rejects a ballot with any other pseudonym.
 */
export function pseudonymFor(voter: string, proposalId: string): Uint8Array {
  const voterBytes = arrayify(voter.toLowerCase());
  const idBytes = arrayify(proposalId);
  const buf = new Uint8Array(voterBytes.length + idBytes.length);
  buf.set(voterBytes, 0);
  buf.set(idBytes, voterBytes.length);
  return arrayify(keccak256(buf));
}

/** Where to request the voter's credential. */
export interface CredentialSource {
  /** Sequencer base URL. */
  sequencerUrl: string;
  space: string;
}

interface BallotSource extends CredentialSource {
  voter: string;
  proposalId: string; // 0x-prefixed bytes32
  mpk: string; // 0x-prefixed compressed G2 (96 bytes)
  config: BallotVerifyParams; // proposal.te_config
}

export interface BuildTeBallotArgs extends BallotSource {
  /** 1-based candidate index the user clicked. */
  choice: number;
}

export interface BuildTeWeightedBallotArgs extends BallotSource {
  /** Snapshot weighted choice: 1-based candidate index (as string) → weight. */
  choice: Record<string, number>;
}

/**
 * Encrypts, proves and signs a ballot for the given votes. The voter's one-time
 * key `sk` exists only inside this function.
 */
async function buildEnvelope(
  args: BallotSource,
  votes: bigint[]
): Promise<TeBallotEnvelope> {
  const { voter, proposalId, mpk, config, sequencerUrl, space } = args;
  await ensureCurvesInit();

  const electionId = arrayify(proposalId);
  const pseudonym = pseudonymFor(voter, proposalId);
  const mpkBytes = arrayify(mpk);
  // Decoded only to refuse a bad key before a credential is requested.
  G2Point.fromBytes(mpkBytes).destroyWasm();

  const { sk, vk } = schnorrKeygen();
  const vkHex = hexlify(vk.toBytes());
  vk.destroyWasm();

  // The credential is issued for this key, so request it before building the ballot.
  const issued = await requestBallotCredential({
    sequencerUrl,
    space,
    proposalId,
    vk: vkHex,
    voter
  });

  const ballot = await buildBallotInWorker({
    mpk: mpkBytes,
    electionId,
    pseudonym,
    sk,
    votes,
    // A plain copy: the proposal's config may be a reactive proxy, which cannot
    // be posted to a worker.
    params: { ...config },
    attestation: toSdkAttestation(issued.attestation)
  });

  return {
    electionId: hexlify(ballot.electionId),
    pseudonym: hexlify(ballot.pseudonym),
    vk: hexlify(ballot.vk),
    ciphertexts: ballot.ciphertexts.map(([c1, c2]) => ({
      c1: hexlify(c1),
      c2: hexlify(c2)
    })),
    zkProof: hexlify(ballot.zkProof),
    voterSignature: hexlify(ballot.voterSignature),
    // Inside the envelope, so the EIP-712 vote signature covers it too.
    attestation: issued.attestation
  };
}

/**
 * Builds the ballot for a single-choice or basic vote: 1 for the chosen option
 * and 0 for the others (budget 1).
 */
export async function buildTeBallotEnvelope(
  args: BuildTeBallotArgs
): Promise<TeBallotEnvelope> {
  const { config, choice } = args;

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

  const votes: bigint[] = new Array(config.numCandidates).fill(0n);
  votes[choice - 1] = 1n;
  return buildEnvelope(args, votes);
}

/**
 * Turns a weighted choice into whole votes that add up exactly to `budget`, as
 * the SDK requires. Each option gets the whole part of its share, and the
 * leftover votes go to the options with the largest remainders.
 */
export function weightedVoteVector(
  choice: Record<string, number>,
  budget: number,
  numCandidates: number
): number[] {
  const totalWeight = Object.values(choice).reduce((a, b) => a + b, 0);
  if (totalWeight <= 0) {
    throw new Error(
      'buildTeWeightedBallotEnvelope: choice weights sum to zero'
    );
  }
  const exact = Array.from({ length: numCandidates }, (_, j) => {
    const w = choice[String(j + 1)] ?? 0;
    return (w / totalWeight) * budget;
  });
  const floors = exact.map(Math.floor);
  const remaining = budget - floors.reduce((a, b) => a + b, 0);
  const order = exact
    .map((v, i) => ({ frac: v - Math.floor(v), i }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remaining; k++) floors[order[k].i]++;
  return floors;
}

/**
 * Builds the ballot for a weighted vote. `choice` is Snapshot's weighted format,
 * for example `{ "1": 60, "2": 40 }`: a 1-based option number mapped to a
 * positive weight. The weights can add up to any total.
 */
export async function buildTeWeightedBallotEnvelope(
  args: BuildTeWeightedBallotArgs
): Promise<TeBallotEnvelope> {
  const { config, choice } = args;

  if (config.variant !== 'A' || config.mode !== 'exact') {
    throw new Error(
      `buildTeWeightedBallotEnvelope: only Variant A exact is supported; got ${JSON.stringify(config)}`
    );
  }

  const votes: bigint[] = weightedVoteVector(
    choice,
    config.budget,
    config.numCandidates
  ).map(BigInt);
  return buildEnvelope(args, votes);
}
