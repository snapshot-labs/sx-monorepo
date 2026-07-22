# Actor Usage Guide

This document maps every actor in the Munich *Personalratswahl* voting flow to
the **exact SDK functions** they must call and the **exact arguments** they
must supply. It is a reading of `src/index.ts`: only symbols exported from the
SDK are named here.

The five actors covered:

1. **Election Authority** — publishes election parameters; does not call the
   SDK at runtime but fixes the values everybody else passes in.
2. **Voter (frontend / client)** — encrypts votes, builds the ballot validity
   proof, signs the canonical preimage. **One wrapper call:** `buildBallot`.
3. **Vote Registry / Vote Proxy / auditor (ballot verifier)** — verifies each
   submitted ballot before it is admitted to the tally. **One call:**
   `verifyBallot`.
4. **Keyper (committee member)** — after the vote phase closes, computes a
   partial decryption share on the homomorphic ciphertext sum. **One call:**
   `partialDecrypt`.
5. **Tally Aggregator** — verifies keyper shares, combines a threshold set,
   runs BSGS to recover each candidate's integer tally. **One wrapper
   call:** `recoverTally`.

> Every caller **must** call `await initCurves()` exactly once before
> invoking anything else. The BLST WASM heap is a singleton and is not
> re-entrant across workers — do not call decryption benchmarks and ballot
> benchmarks in the same worker.

---

## Shared setup

```ts
import { initCurves } from '@shutter-network/shutter-voting-sdk';
await initCurves();
```

## Shared parameter bag — `BallotVerifyParams`

The voter, the ballot verifier, and anything that reconstructs the budget
proof all need the **identical** parameter bag:

```ts
type BallotVerifyParams = {
  numCandidates: number;       // ℓ, 1..65535
  budget:        number;       // B, 1..65535
  mode:         'exact' | 'atMost';
  variant:      'A' | 'B';
  d?:            number;       // Variant B only: must equal ⌈log₂(B+1)⌉
};
```

Drift in **any** field between prover and verifier makes every ballot fail —
the values are bound into the Fiat–Shamir transcript (`seedBallotTranscript`)
and into the wire codec.

---

## 1. Election Authority

The Election Authority does not run SDK code at ballot time; it publishes
on-chain constants that every other actor reads. Those constants are:

| Constant           | Used by                                              | Notes                                                                 |
| ------------------ | ---------------------------------------------------- | --------------------------------------------------------------------- |
| `electionId` (32B) | voter, verifier, keyper transcript                   | Bound into `canonicalBallotMessage` and `seedBallotTranscript`.       |
| `mpk: G2Point`     | voter (to encrypt), verifier, keyper                 | Committee public key from DKG (should be published by keypers).       |
| `numCandidates ℓ`  | voter, verifier                                      | Number of candidates on the ballot.                                   |
| `budget B`         | voter, verifier, tally (BSGS upper bound = `ℓ · B`) | Max votes per ballot.                                                 |
| `mode`             | voter, verifier                                      | `'exact'` forces V = B; `'atMost'` allows V ≤ B.                      |
| `variant`          | voter, verifier                                      | `'A'` = direct range proofs; `'B'` = bit-decomposition.               |
| `d` (Variant B)    | voter, verifier                                      | **Must** be `Math.ceil(Math.log2(B + 1))`.                            |
| Keyper committee   | tally aggregator, auditors                           | Each keyper k holds `msk_k`; its `mpk_k = msk_k · P₂` is on chain.    |
| Threshold `t`      | tally aggregator                                     | Need any `t + 1` verified shares to reconstruct.                      |

The Election Authority itself calls **no SDK functions**.

> The Vote Registry / Vote Proxy layer (out of SDK scope) **must reject
> duplicate `pseudonym` submissions**. `verifyBallot` only checks one
> ballot at a time and does not maintain any cross-ballot state.

---

## 2. Voter (frontend / client)

The voter's job is to produce a `BallotInputs` struct and submit it to the
Vote Registry. With the high-level wrapper this is **two calls**:
`schnorrKeygen` (for the ephemeral keypair the WR-Server attests over), then
`buildBallot` for everything else.

### 2.1 Ephemeral keypair + WR registration

```ts
import { schnorrKeygen } from '@shutter-network/shutter-voting-sdk';

// Fresh ephemeral Schnorr keypair, bound to this ballot only.
const { sk, vk } = schnorrKeygen();           // sk: bigint, vk: G1Point
```

The voter registers `vk.toBytes()` with the Wahlregister-Server to obtain the
WR attestation (`wrAttestation: Uint8Array`) and a `pseudonym: Uint8Array`
(32 bytes). **Both are opaque to the SDK** — the SDK only passes them
through to the caller-supplied attestation verifier on the verifier side.

### 2.2 Build the ballot in one call

```ts
import {
  buildBallot,
  type BallotInputs,
  type BallotVerifyParams,
  type G2Point,
} from '@shutter-network/shutter-voting-sdk';

const params: BallotVerifyParams = {
  numCandidates: ℓ,
  budget:        B,
  mode:          'atMost',  // or 'exact'
  variant:       'A',       // or 'B' (then set d = Math.ceil(Math.log2(B+1)))
};

const inputs: BallotInputs = buildBallot({
  mpk,                  // G2Point — committee public key from chain
  electionId,           // Uint8Array(32)
  pseudonym,            // Uint8Array(32) issued by WR-Server
  sk,                   // bigint — from schnorrKeygen above
  vk,                   // G1Point — from schnorrKeygen above
  votes,                // bigint[] of length ℓ; each in [0, B] (Variant A)
  params,
  wrAttestation,        // Uint8Array — opaque WR-Server attestation bytes
});
```

`buildBallot` internally:

1. Encrypts each vote (Variant A) or each bit (Variant B) under `mpk`,
   sampling fresh per-ciphertext randomness `r_j`.
2. Seeds the ballot Fiat–Shamir transcript with `(electionId, mpk, vk,
   ciphertexts, params)`.
3. Runs one OR proof per candidate (Variant A) or per bit (Variant B).
4. Homomorphically sums the ciphertexts (Variant A) or
   `Σ_j Σ_k 2^k · c_{j,k}` (Variant B), and produces the matching budget
   proof (`exact` or `atMost`).
5. Encodes the validity proof, builds the canonical preimage, and
   Schnorr-signs `keccak256(preimage)` with `sk`.

The per-ciphertext randomness `r_j` is **dropped on return** — the caller
cannot accidentally retain it.

### 2.3 Final submission

The returned `inputs: BallotInputs` is exactly the payload the voter hands
off to the Vote Registry:

```ts
// inputs already has shape:
// {
//   electionId,                 // bytes32
//   pseudonym,                  // bytes32
//   vk:              Uint8Array(48),     // compressed G₁
//   ciphertexts:     [Uint8Array, Uint8Array][],   // 96B + 96B per pair
//   zkProof:         Uint8Array,         // encodeBallotValidityProof output
//   voterSignature:  Uint8Array(80),     // encodeSchnorr output
//   wrAttestation:   Uint8Array,
// }
```

> ⚠ After the Vote Registry acknowledges submission, the voter **must
> discard `sk` and `votes`**. `r_j` is already gone. Retaining `sk` would
> let a coercer present a vk-bound proof of how the voter voted; the spec
> assumes the voter destroys it (Munich §7.1 coercion resistance).

---

## 3. Ballot verifier (Vote Proxy / auditor)

The verifier has one entry point: `verifyBallot`. It validates the ZK
proofs, the homomorphic budget constraint, the Schnorr signature, and
delegates the WR-Server attestation check to a caller-supplied function.

```ts
import {
  verifyBallot,
  type BallotInputs,
  type BallotVerifyParams,
  type WRAttestationVerifier,
  type G2Point,
} from '@shutter-network/shutter-voting-sdk';

const verifyWR: WRAttestationVerifier = (
  electionId, pseudonym, vk, attestation,
) => {
  // Out-of-SDK scope. Implement per your WR-Server's signature scheme.
  return true;
};

const result = verifyBallot(
  inputs,     // exactly the BallotInputs the voter produced
  params,     // exactly the BallotVerifyParams from the Election Authority
  mpk,        // same G2Point the voter encrypted against
  verifyWR,
);

if (!result.ok) {
  console.error('reject:', result.reason);
} else {
  // Accept, admit to tally.
}
```

### What `verifyBallot` enforces

- `numCandidates`, `budget` in `[1, 65535]`; `mode ∈ {'exact','atMost'}`;
  `variant ∈ {'A','B'}`; Variant B's `d === ⌈log₂(B+1)⌉` exactly.
- `electionId.length === 32`, `pseudonym.length === 32`.
- `mpk` and decoded `vk` are not the identity (kills trivial-signature class).
- Ciphertext count matches `ℓ` (Variant A) or `ℓ·d` (Variant B).
- Each G₂ / G₁ decode succeeds with subgroup check.
- `verifyWR(...)` returns true.
- Each range/bit OR proof verifies against the same transcript the prover seeded.
- The budget proof verifies on the homomorphic `ctSum` (Variant A) or on
  `ĉ = Σ_j Σ_k 2^k · c_{j,k}` (Variant B).
- The Schnorr signature verifies against `vk` and `keccak256(canonicalBallotMessage(...))`.

---

## 4. Keyper (committee member)

Each keyper holds one secret share `msk_k` from the DKG and its index `k`
(1-based). After the voting phase closes, the tally contract publishes the
homomorphic sum of all admitted ciphertexts (per candidate). For **each**
`ctSum_j`, the keyper does exactly one call:

```ts
import {
  partialDecrypt,
  Transcript,
  type Ciphertext,
  type G2Point,
} from '@shutter-network/shutter-voting-sdk';

// Per-candidate inputs — `ctSum_j` is the homomorphic sum over all admitted
// ballots of that candidate's ciphertext column.
const t = new Transcript('SHUTTER-VOTE-DECRYPT-v1');
// Bind whatever election-level context both keyper and verifier agree on:
t.append('electionId', electionId);
t.append('candidate',  u16BE(j));   // or your own scheme

const share = partialDecrypt(
  ctSum_j,       // Ciphertext
  msk_k,         // bigint — NEVER leaves keyper custody
  mpk_k,         // G2Point — = msk_k · P₂, on chain as committeePKs[k-1]
  k,             // number — 1-based keyper index (== evaluation point α_k)
  t,             // Transcript (consumed)
);
// share: PartialDecryption { keyperIndex, sigma, proof }
```

The `share` is published on chain; the tally aggregator (and any auditor)
re-verifies it using the **identical** transcript seeding.

> **Keypers do not call anything else in this SDK.** DKG, share storage, and
> keyper networking are intentionally out of scope.

---

## 5. Tally Aggregator

The aggregator's job is one call:

```ts
import {
  Transcript,
  recoverTally,
  type Ciphertext,
  type G2Point,
  type PartialDecryption,
} from '@shutter-network/shutter-voting-sdk';

// Build a fresh transcript per (candidate, share) call, identically to
// the keyper's seeding above.
function transcriptFor(j: number, _share: PartialDecryption) {
  const t = new Transcript('SHUTTER-VOTE-DECRYPT-v1');
  t.append('electionId', electionId);
  t.append('candidate',  u16BE(j));
  return t;
}

const tallies: bigint[] = recoverTally({
  ctSums,                // Ciphertext[]            — one per candidate
  sharesPerCandidate,    // PartialDecryption[][]   — outer length = ctSums.length;
                         //                           each inner array ≥ threshold + 1
  threshold,             // number                  — DKG threshold t
  committeePKs,          // G2Point[]               — committeePKs[k-1] = mpk_k
  upperBound: BigInt(numBallots) * BigInt(B),  // BSGS bound — total max votes / candidate
  transcriptFor,
});

// tallies[j] is V_j, the integer total for candidate j.
```

`recoverTally` internally:

1. **Verifies every supplied share** against the matching `committeePKs[k-1]`
   using the caller's `transcriptFor(j, share)` factory. Throws on the first
   bad share with `candidate ${j} share from keyper ${k} failed verification`.
2. **Picks the first `threshold + 1` shares** per candidate and Lagrange-
   interpolates them at zero (`combineShares`) to obtain `τ_j = V_j · P₂`.
3. **Builds one BSGS baby-step table** sized to `upperBound` and reuses it
   across all candidates; each per-candidate recovery is then a fast lookup.

It throws if any share fails verification, if a referenced keyper index has
no entry in `committeePKs`, if any candidate has fewer than `threshold + 1`
shares, or if a recovered tally exceeds `upperBound` (the latter signals a
tally-pipeline bug — admitted ballots whose homomorphic sum overshoots the
declared bound, **not** a retry condition).

---

## When to reach past the wrappers

`buildBallot` and `recoverTally` cover the production happy path. The
lower-level primitives stay exported for:

- **Test-vector generation** — call `encrypt`, `proveOR`,
  `proveBudgetExact` / `proveBudgetAtMost`, `partialDecrypt` directly so
  you can inject deterministic randomness.
- **Cross-implementation interop fixtures** — e.g. the `tests/vectors/`
  decrypt-share / tally fixtures consume `verifyDecryptionShare`,
  `combineShares`, and `recoverDiscreteLogWithTable` directly to exercise
  externally produced shares.
- **Audits** — auditors that want to re-derive intermediate values
  (`ctSum`, individual range-proof checks) call `seedBallotTranscript`,
  `verifyOR` (internal — exposed via `verifyBallot`), `sumCts`,
  `verifyDecryptionShare`, etc.
- **Bespoke Variant-B aggregation paths** that do not match the wrapper's
  weighted-sum convention.

If you only need the Munich spec's standard flow, stick to the wrapper
calls listed above.

---

## Summary — function → caller matrix

| SDK export                          | Election Auth. | Voter | Ballot Verifier | Keyper | Tally Agg. |
| ----------------------------------- |:--------------:|:-----:|:---------------:|:------:|:----------:|
| `initCurves`                        |                |   ✅  |       ✅        |   ✅   |     ✅     |
| `schnorrKeygen`                     |                |   ✅  |                 |        |            |
| `buildBallot` (wrapper)             |                |   ✅  |                 |        |            |
| `verifyBallot`                      |                |       |       ✅        |        |            |
| `Transcript` (constructor)          |                |       |                 |   ✅   |     ✅     |
| `partialDecrypt`                    |                |       |                 |   ✅   |            |
| `recoverTally` (wrapper)            |                |       |                 |        |     ✅     |

Primitives still exported for vector generation / audits / bespoke flows
(none required on the happy path):

| Primitive                                              | Composed inside                                     |
| ------------------------------------------------------ | --------------------------------------------------- |
| `encrypt`, `addCt`, `scalarMulCt`, `sumCts`            | `buildBallot`                                       |
| `seedBallotTranscript`, `rangeCandidates`              | `buildBallot`, `verifyBallot`                       |
| `proveOR`, `proveBudgetExact`, `proveBudgetAtMost`     | `buildBallot`                                       |
| `encodeBallotValidityProof`, `canonicalBallotMessage`  | `buildBallot`                                       |
| `schnorrSign`, `encodeSchnorr`                         | `buildBallot`                                       |
| `verifyDecryptionShare`                                | `recoverTally`                                      |
| `combineShares`                                        | `recoverTally`                                      |
| `buildBabyStepTable`, `recoverDiscreteLogWithTable`    | `recoverTally`                                      |
| `recoverDiscreteLog`                                   | (single-shot equivalent of the WithTable pair)      |
| `encodeDLEQ`, `decodeDLEQ`                             | (auditor-side share inspection)                    |

The `G1Point` / `G2Point` / `Ciphertext` / proof-record types are surface
for the inputs and outputs of every call above.
