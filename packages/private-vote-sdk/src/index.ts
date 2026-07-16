// Public surface of @shutter-network/shutter-voting-sdk.
//
// Exports here are the ones actors in the Munich Personalratswahl flow
// actually need: voter, Vote Registry / Proxy, Tally Aggregator, auditor,
// and keyper. Scalar / field / hash primitives, bare DLEQ, standalone OR /
// budget verifiers, and byte-size constants stay internal — callers work
// in terms of ciphertexts, proofs, signatures, and ballot-level verify.

export { initCurves } from './crypto/init';
export { G1Point, G2Point, G1_BYTES, G2_BYTES } from './crypto/curve';

// Voting types
export type {
  Ciphertext,
  SchnorrSig,
  DLEQProof,
  ORProof,
  BudgetProof,
  BallotValidityProof,
  PartialDecryption,
} from './voting/types';

export { encrypt, addCt, scalarMulCt, sumCts } from './voting/encrypt';
export { schnorrKeygen, schnorrSign, schnorrVerify } from './voting/schnorr';
export { Transcript } from './voting/transcript';

// Voter-side proof construction. Verifiers use `verifyBallot` (below); the
// bare `verifyDLEQ`/`verifyOR`/`verifyBudget*` primitives are internal.
export {
  proveOR,
  proveBudgetExact,
  proveBudgetAtMost,
} from './voting/proofs';
export type {
  ORStatement,
  ORWitness,
  ORCommitments,
  BudgetStatement,
  ExactBudgetWitness,
  AtMostBudgetWitness,
} from './voting/proofs';

export {
  canonicalBallotMessage,
  seedBallotTranscript,
  rangeCandidates,
  verifyBallot,
} from './voting/verify';
export type {
  BallotInputs,
  BallotVerifyParams,
  VerifyResult,
  WRAttestationVerifier,
} from './voting/verify';

// High-level actor wrappers — collapse multi-step voter and tally
// aggregator flows into one call. The lower-level primitives above
// remain exported for vector generation, audits, and bespoke
// aggregation paths.
export { buildBallot, recoverTally } from './voting/highlevel';
export type { BuildBallotArgs, RecoverTallyArgs } from './voting/highlevel';

export {
  partialDecrypt,
  verifyDecryptionShare,
  combineShares,
  recoverDiscreteLog,
  recoverDiscreteLogWithTable,
  buildBabyStepTable,
} from './voting/decrypt';
export type { BabyStepTable } from './voting/decrypt';

// Wire codecs — producers only (encode on prove/sign side, decode only
// where the verifier needs on-chain bytes it can't get from `verifyBallot`).
export {
  encodeBallotValidityProof,
  encodeDLEQ,
  decodeDLEQ,
  encodeSchnorr,
} from './contract/codec';
