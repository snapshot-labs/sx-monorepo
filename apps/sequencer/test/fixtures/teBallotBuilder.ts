import {
  buildBallot,
  G2Point,
  schnorrKeygen
} from '@shutter-network/urban-verified-crypto';
import { mintAttestation } from '../../src/helpers/gegAttestation';

const toHex = (b: Uint8Array) => `0x${Buffer.from(b).toString('hex')}`;

export interface CastBallotArgs {
  electionId: string;
  pseudonym: string;
  nonce: number;
  weight?: number;
  numCandidates?: number;
  budget?: number;
  /** Sign the binding over a *different* credential — the substitution attack. */
  bindTo?: any;
}

/** One ballot plus a credential for it, built exactly as the browser would. */
export async function castBallot(opts: CastBallotArgs) {
  const ID = opts.electionId;
  const BUDGET = opts.budget ?? 3;
  const NUM_CANDIDATES = opts.numCandidates ?? 3;
  const { sk, vk } = schnorrKeygen();
  const vkHex = toHex(vk.toBytes());
  const mpk = G2Point.generator();

  const weight = BigInt(opts.weight ?? 1);
  const attestation = {
    scheme: 'ATTESTATION_V1',
    electionId: ID,
    pseudonym: opts.pseudonym,
    vk: vkHex,
    weight: Number(weight),
    nonce: opts.nonce,
    signature: await mintAttestation({
      electionId: ID,
      pseudonym: opts.pseudonym,
      vk: vkHex,
      weight,
      nonce: BigInt(opts.nonce)
    })
  };

  const toSdk = (a: typeof attestation) => ({
    electionId: Buffer.from(a.electionId.slice(2), 'hex'),
    pseudonym: Buffer.from(a.pseudonym.slice(2), 'hex'),
    vk: Buffer.from(a.vk.slice(2), 'hex'),
    weight: BigInt(a.weight),
    nonce: BigInt(a.nonce),
    signature: Buffer.from(a.signature.slice(2), 'hex')
  });

  // `bindTo` signs over a credential other than the one shipped — the forged
  // pairing, built the way an attacker would rather than by corrupting bytes after
  // the fact. Under v1 that needed a separate binding signature; now it just means
  // the ballot was signed over a different credential than it carries.
  const built = buildBallot({
    mpk,
    electionId: Buffer.from(ID.slice(2), 'hex'),
    pseudonym: Buffer.from(opts.pseudonym.slice(2), 'hex'),
    sk,
    vk,
    votes: Array.from({ length: NUM_CANDIDATES }, (_, i) =>
      i === 0 ? BigInt(BUDGET) : 0n
    ),
    params: {
      numCandidates: NUM_CANDIDATES,
      budget: BUDGET,
      mode: 'exact',
      variant: 'A'
    },
    attestation: toSdk((opts.bindTo as any) ?? attestation)
  });

  const envelope = {
    electionId: ID,
    pseudonym: toHex(built.pseudonym),
    vk: vkHex,
    ciphertexts: built.ciphertexts.map(([c1, c2]: any) => ({
      c1: toHex(c1),
      c2: toHex(c2)
    })),
    zkProof: toHex(built.zkProof),
    voterSignature: toHex(built.voterSignature)
  };

  return { envelope, attestation };
}
