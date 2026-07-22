# Shutter SDK → ElGamal Voting Extension: Development Plan

**Status:** Planning draft
**Date:** April 2026
**Target:** `@shutter-network/shutter-sdk` fork / extension for the Munich Personalratswahl prototype

---

## 0. Design Principles

This is a planning document. Rather than track version history, the key design decisions that shape the plan are recorded here:

1. **One library for encryption/decryption and zero-knowledge proofs.** They live together in `src/voting/` because they are deeply coupled — the OR-proof consumes the randomness produced by `encrypt` and re-uses the same transcript-bound ciphertext. Splitting them would create a false API boundary.
2. **SDK exposes functions, not APIs.** No `Voter` or `Keyper` class / service wrapper. Consumers (the web app, the Vote Proxy, the Tally Aggregator, the keyper) import plain functions and compose what they need.
3. **No bespoke wire formats, no contract-struct mirrors.** The on-chain structures in the *Blockchain / Smart Contract Interface Specification* are the wire format, and the SDK consumer (web app, Vote Proxy, Tally Aggregator, auditor) already has those structs via its own ABI layer (viem/ethers codegen or hand-rolled). The SDK does **not** ship a duplicate set of `Ballot` / `ElectionConfig` / `DecryptionShare` types — that would create a second source of truth that can drift. The SDK's serialisation surface is exactly one thing: a versioned encoding for the single opaque `bytes` field the contract leaves to us — `zkProof`.
4. **No ballot builder.** The contract defines the `Ballot` struct; per the sequence diagram the frontend (Phase 2) assembles it and the Vote Proxy (Phase 3) submits it. The SDK's job is to produce the ingredients — ciphertexts, a `zkProof` blob, and a Schnorr signature — and let the caller assemble a `Ballot` directly against the contract type. A single shared helper, `canonicalBallotMessage`, keeps the Schnorr preimage bytes identical between signer and verifier.
5. **No DKG in the SDK.** DKG runs off-chain among keypers (Phase 0 per the sequence diagram). DKG belongs to keyper infrastructure, not to this package.
6. **Narrow keyper surface.** Keypers import exactly one function, `partialDecrypt`, to produce the DLEQ-proven decryption share the contract expects. Everything else on the keyper side (DKG, key storage, share transport, orchestration) stays out of this SDK.

---

## 0.1 Implementation Deviations from this Plan

This section tracks *intentional* deviations from the signatures and structures sketched below, as they were made during implementation. The two source PDFs (Munich protocol spec v0.3 and "Potential Extensions for Shutter") remain the authoritative specification — this plan is updated to match the code, never the other way around.

### D-1. Scalars are plain `bigint`, not a `Scalar` class (P1)

The `Scalar` class in §5.1 was dropped. The `G1Point` / `G2Point` wrappers stay because BLST's raw `add` / `mul` mutate in place and `fromBytes` doesn't run subgroup checks. The `Scalar` wrapper added no such safety — BLST's scalar arithmetic does not even reduce mod Q reliably — so every scalar op was already going through a bigint round-trip. Collapsing to `bigint` removes the ceremony without losing anything.

Downstream surface changes:
- `hashToScalar(...)` returns `bigint` (not `Scalar`).
- `G1Point.mul(s: bigint)`, `G2Point.mul(s: bigint)` — BLST-scalar conversion is internal.
- `SchnorrSig.s: bigint`, `DLEQProof.{e,z}: bigint`, `ORProofBranch.{e,z}: bigint`, `BallotValidityProof` sub-scalars all become `bigint`.
- `field.ts` exports `randomScalar()`, `scalarToBytes(s)`, `scalarFromBytes(b)`, `scalarInv(a)`, plus the existing `Q` / `SCALAR_BYTES` / `modQ` / `wideReduce`.
- `scalarInv` uses bigint square-and-multiply (timing depends only on public `Q`). Only public-challenge inverses are taken in this SDK; secret randomness is never inverted. If that changes, swap to a constant-time implementation.

### D-2. Injectable randomness via optional parameters (P2)

`encryptWithRandomness` as a separate entry point is collapsed into `encrypt`:

```typescript
encrypt(m: bigint, mpk: G2Point, r?: bigint): { ct: Ciphertext; r: bigint }
```

If `r` is omitted, it's sampled via `randomScalar()`. Callers that need deterministic encryption (test vectors, Variant-B bit-assembly) pass a pre-sampled `r`.

Same pattern applied to Schnorr:
```typescript
schnorrKeygen(sk?: bigint): { sk: bigint; vk: G1Point }
schnorrSign(sk: bigint, vk: G1Point, msg: Uint8Array, k?: bigint): SchnorrSig
```

P3 proof functions (`proveDLEQ`, `proveOR`, `proveBudget`) will follow the same convention — an optional commitment-randomness object (e.g. `{ w?: bigint }` for DLEQ; `{ w?: bigint; simulated?: ... }` for OR). No global RNG hook; every injection site is explicit.

### D-3. BLST scalar arithmetic is not used directly

BLST's `Scalar.add/sub/mul/neg` do not always reduce mod Q, so downstream point-mul calls reject the result with `BLST_ERROR_BAD_SCALAR`. All scalar arithmetic goes through bigint + `modQ`. BLST is still used for point arithmetic (constant-time in the library) and the compressed serialisation codecs.

### D-3a. `Transcript` folds challenges back (Merlin-style)

The plan sketches the transcript as an append-only byte log seeded with a domain label. We kept that and added two properties:

1. **Length-prefixed appends.** Each `append(tag, value)` writes `u32BE(|tag|) || tag || u32BE(|value|) || value`. Concatenation is injective — splitting a value into two appends cannot collide with a single longer append.
2. **Challenge fold-back.** After drawing a challenge `e = H(DST, tag, …transcript)` the challenge is appended back via `appendScalar(tag + ':chal', e)`. Single-challenge proofs (current DLEQ/OR) are unaffected; multi-round proofs we might add later (budget, decryption-share bundles) are automatically domain-separated without extra care from callers.

`appendPoint` uses compressed encodings (48 B for G₁, 96 B for G₂) so the bytes are canonical. `appendScalar` rejects values outside `[0, Q)` — catches accidental non-reduced scalars at the seed site rather than at challenge time.

### D-3b. DLEQ / OR API shape — named statement/witness types, self-binding

The plan gives the constructions; we committed to a concrete surface:

```typescript
proveDLEQ(stmt: DLEQStatement, witness: DLEQWitness, t: Transcript, commit?: { w?: bigint }): DLEQProof
verifyDLEQ(stmt: DLEQStatement, proof: DLEQProof, t: Transcript): boolean

proveOR(stmt: ORStatement, witness: ORWitness, t: Transcript, commit?: ORCommitments): ORProof
verifyOR(stmt: ORStatement, proof: ORProof, t: Transcript): boolean
```

- `DLEQStatement = { base1, point1, base2, point2 }` — two G₂ bases, two G₂ points. General enough to serve both the exact-budget proof (§6.1.3) and the keyper decryption-share proof (§6.3).
- `ORStatement = { ct, mpk, candidates: readonly bigint[] }`; `ORWitness = { r, trueIndex }`. Candidates are the plaintext set `M = {m_0, …, m_B}` in order — the verifier's branch index is the same as the prover's.
- `ORCommitments = { w?: bigint; simulated?: readonly ({ e, z } | null)[] }`. `simulated` is length-`|M|` with `null` at `trueIndex` (the real branch isn't pre-sampled). Intended for test vectors; omit in production.
- Each prove/verify function **binds its own statement** internally via `bindStatement*` helpers, so callers only seed the transcript with outer context (electionId, vk, …). The statement points are appended inside the proof function rather than being the caller's responsibility — less room for prover/verifier seeding drift.

### D-3c. Budget proof — split by mode, thin wrappers, mode-byte transcript binding

The plan sketches a unified signature:

```typescript
proveBudget(ctSum, rSum, budget, mode, mpk, t, commit?): BudgetProof
```

Shipped surface splits by mode because the witnesses differ (exact needs only `rSum`; at-most also needs `V ∈ [0, B]` to pick the true branch):

```typescript
proveBudgetExact(stmt: BudgetStatement,  witness: { rSum }, t, commit?: { w? }): BudgetProof
proveBudgetAtMost(stmt: BudgetStatement, witness: { rSum, V }, t, commit?: ORCommitments): BudgetProof
verifyBudgetExact(stmt, proof: DLEQProof, t): boolean
verifyBudgetAtMost(stmt, proof: ORProof, t): boolean
verifyBudget(stmt, proof: BudgetProof, t): boolean   // dispatcher on proof.mode
```

`BudgetProof` is a discriminated union `{ mode: 'exact'; proof: DLEQProof } | { mode: 'atMost'; proof: ORProof }`. The wire codec reads the mode tag byte (0x00 / 0x01, per §5) and parses the matching inner proof.

Both provers are thin wrappers over P3's `proveDLEQ` / `proveOR` — no new cryptographic construction. `proveBudgetExact` builds the canonical same-log instance `(P₂, cΣ.c1, mpk, cΣ.c2 − B·P₂)` and delegates to `proveDLEQ`. `proveBudgetAtMost` builds the candidate set `{0, 1, …, B}` and delegates to `proveOR` with `trueIndex = Number(V)`.

Before delegating, each function appends `budget:mode` (one byte, 0x00 exact / 0x01 atMost) and `budget:B` (scalar) into the transcript. This is belt-and-braces domain separation: the inner DLEQ/OR bind their own statements, but the mode byte additionally prevents a valid at-most OR proof from being accepted at a verifier that has been told the claim is exact (or vice versa) — important because for `V = B` both modes describe satisfiable statements about the same ciphertext.

### D-5. No contract-struct mirrors in the SDK (pre-P4)

Decision: `src/contract/types.ts` is removed from the plan before implementation. Originally (Principle #3 and §2) the SDK was to ship TypeScript mirrors of every on-chain struct — `Ballot`, `ElectionConfig`, `DKGResult`, `DecryptionShare`, `EncryptedTally`, `ElectionResult`, `DLEQProofBytes`, plus `G1PointBytes` / `G2PointBytes` aliases. That's wrong.

**Why wrong.** The consumer (web app, Vote Proxy, Tally Aggregator, auditor) already has these shapes via their own contract-ABI layer (viem/ethers codegen, or hand-rolled against the Solidity ABI). An SDK-side copy is a second source of truth: every redeploy of the contract that tweaks a struct means either the SDK mirror drifts silently, or we have to cut a new SDK release just to track a field rename — neither is acceptable.

**What stays.** The SDK owns the in-memory computational types (`Ciphertext`, `DLEQProof`, `ORProof`, `BudgetProof`, `SchnorrSig`, `BallotValidityProof`) — these are not contract structs; they're the ingredients the SDK operates on. The SDK also owns exactly one serialisation surface: the opaque `bytes` field the contract leaves to us (`zkProof`), encoded/decoded via `src/contract/codec.ts`.

**API impact.** Every consumer-facing SDK function takes primitive-typed inputs (raw `Uint8Array` for points/signatures/attestations, `number` / `bigint` for scalars) at the SDK/consumer boundary, never a contract-shaped object. Concretely:

- `verifyBallot(inputs: BallotInputs, params: BallotVerifyParams, mpk: G2Point, verifyWRAttestation)` — `BallotInputs` holds only the bytes the caller destructured off their `Ballot`; `BallotVerifyParams` holds only the `ElectionConfig` subset the verifier actually needs (`numCandidates`, `budget`, `mode`, `variant`, `d?`).
- `canonicalBallotMessage` already takes primitives; no change.
- Decryption-share functions (P5) will similarly take `(mpk_k: G2Point, sigma: G2Point, proof: DLEQProof, …)` instead of a `DecryptionShare` contract struct.

§2 is rewritten to point at this deviation rather than duplicating the contract types.

### D-4. Module layout — `src/crypto/blst/` keeps the upstream WASM vendor tree

Upstream ships BLST under `src/crypto/blst/`, not `src/blst/`. We kept the upstream layout (verbatim `git clone`) rather than moving the tree. §4.1 is updated to reflect `src/crypto/blst/` containing `blst.js`, `blst.wasm`, plus the hand-written `types.ts` re-exports. Also added `src/crypto/init.ts` (WASM runtime init + ready-gate — upstream had this inline; factoring it out lets tests await it once).

### D-6. Public surface is the actor-facing operations only

§5 of this plan describes the internal module layout — what lives inside `src/crypto/`, `src/voting/`, and `src/contract/`. The *public* surface (what `src/index.ts` exports under `@shutter-network/shutter-voting-sdk`) is narrower: it is exactly the set of operations the five actor roles (voter, Vote Proxy / Vote Registry, Tally Aggregator, auditor, keyper) need to carry out their step of the protocol.

Concretely, the package-root exports are:

- **Curve + WASM boot:** `initCurves`, `G1Point`, `G2Point`, `G1_BYTES`, `G2_BYTES`.
- **ElGamal:** `encrypt`, `addCt`, `scalarMulCt`, `sumCts`, and the `Ciphertext` type.
- **Fiat–Shamir:** the `Transcript` class.
- **Schnorr:** `schnorrKeygen`, `schnorrSign`, `schnorrVerify`, `SchnorrSig`.
- **Voter-side proof constructors:** `proveOR`, `proveBudgetExact`, `proveBudgetAtMost`, their statement/witness/commitment argument types, and the `ORProof` / `DLEQProof` / `BudgetProof` / `BallotValidityProof` types.
- **Ballot verification (Vote Proxy / auditor):** `verifyBallot`, `canonicalBallotMessage`, `seedBallotTranscript`, `rangeCandidates`, and the `BallotInputs` / `BallotVerifyParams` / `VerifyResult` / `WRAttestationVerifier` types.
- **Decrypt side (keyper / tally / auditor):** `partialDecrypt`, `verifyDecryptionShare`, `combineShares`, `recoverDiscreteLog`, `buildBabyStepTable`, `recoverDiscreteLogWithTable`, `BabyStepTable`, `PartialDecryption`.
- **Wire codecs:** `encodeBallotValidityProof`, `encodeDLEQ`, `decodeDLEQ`, `encodeSchnorr`.

What §5.1 and §5.2 describe as building blocks — scalar helpers (`randomScalar`, `modQ`, `scalarInv`, `Q`, `SCALAR_BYTES`, `bytesToBigIntBE`, `bigIntToBytesBE`, `wideReduce`, `scalarToBytes`, `scalarFromBytes`), hash primitives (`hashToScalar`, the `DST_*` constants), bare `proveDLEQ` / `verifyDLEQ` / `verifyOR` / `verifyBudget*`, and ballot-side decoders (`decodeBallotValidityProof`, `decodeSchnorr`) — are internals of the kept operations. They are reachable via subpath imports (`src/crypto/field`, `src/voting/proofs`, `src/contract/codec`) for tests, benchmarks, and the cross-impl vector generator, which need them for determinism and white-box assertions. Package consumers do not: `encrypt` seeds its own randomness and transcripts; `proveOR` and the budget provers own the DLEQ / OR composition; `verifyBallot` owns every ballot-side decode and sub-verifier; `partialDecrypt` and `verifyDecryptionShare` own the share-side DLEQ. Exposing the building blocks at the package root would invite consumers to roll their own protocol against the Munich spec, which is a cryptographic-review hazard and not something the SDK is meant to enable.

This matches Principle #2 ("SDK exposes functions, not APIs") read strictly: the functions are the *protocol operations*, not the scalar primitives they are built on.

---

## 1. Scope Statement

The SDK targets the following consumers:

| Consumer | What they need the SDK for |
|---|---|
| Web app (voter) | Encrypt the vote vector; build range / budget proofs; Schnorr-sign the ballot payload; assemble a `Ballot` struct and hand it to the Vote Proxy |
| Vote Proxy | Verify a submitted ballot (Schnorr + ZK proofs + subgroup checks) before forwarding `submitVote` to the contract |
| Tally Aggregator | Homomorphically sum active ciphertexts; combine keyper decryption shares; recover the plaintext tally by discrete-log search |
| Independent verifier / auditor | Re-run ballot verification, re-aggregate, re-verify DLEQ proofs of decryption shares against on-chain data |
| Keyper (narrow use only) | One function: `partialDecrypt` — compute σ_{k,j} = msk_k · C1 and the accompanying DLEQ proof. DKG, key storage, and orchestration remain entirely outside the SDK. |

Explicitly **out of scope**:

- Distributed key generation (DKG). Belongs to keyper infrastructure.
- Keyper orchestration, key storage, share transport, or networking. The SDK's keyper surface is a single pure function (`partialDecrypt`).
- Any network / RPC client. The SDK produces and consumes bytes and typed structs; it does not fetch or submit them.

---

## 2. Relationship to the On-Chain Contract

The on-chain contract types from the Blockchain / Smart Contract Interface Specification (`Ballot`, `ElectionConfig`, `DKGResult`, `DecryptionShare`, `EncryptedTally`, `ElectionResult`) are authoritative and **remain owned by the consumer**, not by this SDK. A consumer already has these shapes via their contract ABI (viem / ethers codegen, or hand-rolled) — duplicating them here would create a second source of truth that silently drifts each time the contract is redeployed.

The SDK therefore takes **primitive-typed inputs** at every consumer-facing boundary. For example, instead of `verifyBallot(ballot: Ballot, cfg: ElectionConfig, …)`, the SDK exposes `verifyBallot({ electionId: Uint8Array, pseudonym: Uint8Array, vk: Uint8Array, ciphertexts: [Uint8Array, Uint8Array][], zkProof: Uint8Array, voterSignature: Uint8Array, wrAttestation: Uint8Array }, { budget, numCandidates, mode, variant, d? }, mpk, verifyWRAttestation)`. The caller destructures the `Ballot` they already hold against their ABI types.

The only serialisation the SDK owns is the encoding of `BallotValidityProof` ↔ the opaque `zkProof: bytes` field. That lives in `src/contract/codec.ts` (the sole file under `src/contract/`). Everything else — decoding the `Ballot` off a transaction, fetching `ElectionConfig` from the contract, constructing `DecryptionShare` payloads for `submitDecryption` — is the consumer's responsibility against their ABI layer.

See deviation D-5 for how this removed `src/contract/types.ts` entirely from the plan.

---

## 3. Current SDK — What We Already Have

### 3.1 Reused Assets

| Asset | Location | Reusability |
|---|---|---|
| `blst.js` + `blst.wasm` WASM bindings | `src/crypto/blst/` | **Full reuse** — G₁/G₂/GT/scalar arithmetic layer |
| BLS12-381 operations (point add, scalar mul, pairing, hash-to-curve, serialisation) | via BLST | **Full reuse** |
| TypeScript build pipeline (`tsup`, `tsconfig.json`) | repo root | **Full reuse** |
| Jest test harness | repo root | **Full reuse** |
| Browser asset placement conventions (`public/blst.js`, `public/blst.wasm`) | README | **Full reuse** |
| Vite `optimizeDeps.exclude` workaround | README | **Full reuse** |
| `encryptData` / `decrypt` (IBE) | `src/` | **Discard** — IBE semantics do not match |
| npm package scaffolding | repo root | **Full reuse** with renamed package |

### 3.2 What BLST Gives Us for Free

G₁/G₂/GT types, scalar mul, point add, pairings, RFC 9380 hash-to-curve, subgroup checks, compressed serialisation (48 / 96 / 32 bytes). Exactly the primitives needed for ElGamal in G₂, DLEQ, and Schnorr in G₁.

### 3.3 What BLST Does Not Give Us

- Fr inversion on demand — wrap via Fermat (`a⁻¹ = a^(q−2)`).
- Hash-to-scalar — wrap SHA-256 / SHA-512 → wide reduction mod q.
- Polynomial arithmetic, commitment schemes — not needed in this SDK now that DKG is out of scope.

---

## 4. Target Architecture — The New Voting SDK

### 4.1 Module Layout

```
shutter-voting-sdk/
├── src/
│   ├── crypto/                        # curve + field + hash primitives
│   │   ├── blst/                      # [REUSE] unchanged WASM bindings (upstream layout)
│   │   │   ├── blst.js
│   │   │   ├── blst.wasm
│   │   │   └── types.ts
│   │   ├── init.ts                    # WASM runtime init + ready-gate
│   │   ├── curve.ts                   # G1Point, G2Point typed wrappers over BLST
│   │   ├── field.ts                   # bigint-valued scalar helpers: random, inv, mod, wide-reduction, bytes codec
│   │   └── hash.ts                    # hash_to_scalar → bigint, domain separators
│   ├── voting/                        # ONE library: ElGamal + ZK proofs + Schnorr
│   │   ├── types.ts                   # Ciphertext, DLEQProof, ORProof, BudgetProof, SchnorrSig
│   │   ├── encrypt.ts                 # Enc(m, mpk) → (ct, r); homomorphic add / scalarMul / sum
│   │   ├── decrypt.ts                 # combineShares + BSGS discrete-log recovery
│   │   ├── proofs.ts                  # DLEQ, (B+1)-branch OR, range_A, bit_B, budget
│   │   ├── schnorr.ts                 # Schnorr sign / verify over G₁
│   │   ├── verify.ts                  # ballot-level verification (composes the above)
│   │   └── transcript.ts              # Fiat–Shamir transcript
│   ├── contract/                      # zkProof wire codec (no type mirrors — see D-5)
│   │   └── codec.ts                   # encode/decode BallotValidityProof ↔ zkProof bytes
│   └── index.ts                       # public exports
├── tests/
│   ├── voting.encrypt.test.ts
│   ├── voting.proofs.test.ts
│   ├── voting.verify.test.ts
│   ├── voting.decrypt.test.ts
│   ├── contract.codec.test.ts
│   └── end_to_end.test.ts
├── benchmarks/
└── package.json
```

**Deliberately absent from the layout:** a `src/dkg/` tree (DKG is keyper infrastructure), a `src/wire/` tree (the contract structs are the wire format), `src/contract/types.ts` (consumer owns the contract-struct shapes via their ABI layer — see D-5), `src/ballot/builder_*.ts` (frontend assembles the `Ballot` struct), `src/voter.ts` and `src/keyper.ts` high-level wrappers (SDK exposes plain functions), and a separate `src/tally/` (collapsed into `src/voting/`).

### 4.2 Package Naming

`@shutter-network/shutter-voting-sdk` — avoids collision with the production IBE SDK so a single app can depend on both if it also uses Shutter's threshold encryption for unrelated features.

---

## 5. Component-by-Component Plan

### 5.1 Layer 0: Curve Primitives (`src/crypto/`)

Thin typed wrappers over BLST so nothing downstream touches raw WASM.

```typescript
// src/crypto/curve.ts
export class G2Point {
  static fromBytes(b: Uint8Array): G2Point;            // 96-byte compressed, runs subgroup check
  static generator(): G2Point;
  static identity(): G2Point;
  static hashToCurve(msg: Uint8Array, dst: Uint8Array): G2Point;
  add(other: G2Point): G2Point;
  sub(other: G2Point): G2Point;
  mul(s: bigint): G2Point;                             // scalar normalised mod Q internally
  neg(): G2Point;
  equals(other: G2Point): boolean;
  isIdentity(): boolean;
  toBytes(): Uint8Array;
}

export class G1Point { /* analogous; used for voter vk and Schnorr */ }
```

Scalars are plain `bigint`s — see deviation D-1. Helpers live in `field.ts`:

```typescript
// src/crypto/field.ts
export const Q: bigint = 0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001n;
export const SCALAR_BYTES = 32;

export function randomScalar(): bigint;                // 64-byte CSPRNG → mod Q
export function scalarToBytes(s: bigint): Uint8Array;  // canonical 32-BE, rejects s ∉ [0,Q)
export function scalarFromBytes(b: Uint8Array): bigint;// parses canonical 32-BE
export function scalarInv(a: bigint): bigint;          // Fermat (public-challenge use only)
export function modQ(n: bigint): bigint;
export function wideReduce(bytes: Uint8Array): bigint; // ≥64-byte input → mod Q
export function bytesToBigIntBE(b: Uint8Array): bigint;
export function bigIntToBytesBE(n: bigint, length: number): Uint8Array;
```

```typescript
// src/crypto/hash.ts
export const DST_FIAT_SHAMIR = new TextEncoder().encode("SHUTTER-VOTE-FS-v1");
export function hashToScalar(domainSep: Uint8Array, ...parts: Uint8Array[]): bigint;
```

Two keccak256 invocations with 1-byte prefixes → 64 bytes → wide reduction mod Q. Using keccak256 (already a `viem` dependency) keeps the construction reproducible by any Solidity-adjacent verifier.

### 5.2 Layer 1: Voting Core (`src/voting/`)

One cohesive library. Types, encryption, ZK proofs, Schnorr, and verification live here because they share state (randomness, transcript, bound statements).

#### `types.ts`

```typescript
export interface Ciphertext {
  c1: G2Point;
  c2: G2Point;
}

export interface DLEQProof {
  e: bigint;
  z: bigint;
}

export interface ORProofBranch {
  a1: G2Point;
  a2: G2Point;
  e: bigint;
  z: bigint;
}

export interface ORProof {
  branches: ORProofBranch[];
}

export type BudgetProof =
  | { mode: "exact"; dleq: DLEQProof }
  | { mode: "atMost"; or: ORProof };

export interface SchnorrSig {
  R: G1Point;
  s: bigint;
}

/** Everything that goes into the `zkProof` bytes field of the on-chain Ballot. */
export interface BallotValidityProof {
  version: 0x01;
  variant: "A" | "B";
  rangeOrBit: ORProof[];               // ℓ OR-proofs for A, or ℓ·d bit proofs for B
  budget: BudgetProof;
}

export interface KeyperPublicShare {
  index: number;                       // 1..n
  mpk_k: G2Point;                      // from DKGResult.committeePKs
}

export interface PartialDecryption {
  keyperIndex: number;
  sigma: G2Point;                      // σ_{k,j} = msk_k · (C1_sum)
  proof: DLEQProof;
}
```

#### `encrypt.ts`

```typescript
/** Exponential ElGamal in G₂. Returns the ciphertext AND the randomness — the caller
 *  needs `r` to produce the validity proof. The production IBE SDK hid this; we must expose it.
 *  Optional `r`: when omitted, sampled via randomScalar(); injectable for test vectors
 *  and the Variant-B bit-decomposition path (see deviation D-2). */
export function encrypt(m: bigint, mpk: G2Point, r?: bigint): { ct: Ciphertext; r: bigint };

/** Homomorphic primitives — used by the Tally Aggregator (Phase 4) and by Variant B
 *  ballot construction to reconstruct ĉ_j = Σ_k 2^k · c_{j,k} before the budget proof. */
export function addCt(a: Ciphertext, b: Ciphertext): Ciphertext;
export function scalarMulCt(k: bigint, a: Ciphertext): Ciphertext;
export function sumCts(cts: readonly Ciphertext[]): Ciphertext;
```

#### `transcript.ts`

```typescript
export class Transcript {
  constructor(label: string);
  append(tag: string, value: Uint8Array): void;
  appendPoint(tag: string, p: G1Point | G2Point): void;
  appendScalar(tag: string, s: bigint): void;
  challenge(tag: string): bigint;            // wide-reduced mod q
}
```

Everything public must be appended before `challenge()` is called: `electionId`, `mpk`, `vk`, the ciphertexts being proved about, and every commitment point produced by the prover. Omitting any of these creates proof-copying / replay attacks.

#### `proofs.ts`

One file, five exported pairs of `proveX` / `verifyX` functions, all sharing `Transcript`:

```typescript
// Chaum–Pedersen: log_{A}(B) == log_{C}(D)
// `commit?: { w?: bigint }` — injectable commitment randomness (deviation D-2).
export function proveDLEQ(s: {
  base1: G2Point; point1: G2Point;
  base2: G2Point; point2: G2Point;
  witness: bigint;
}, t: Transcript, commit?: { w?: bigint }): DLEQProof;

export function verifyDLEQ(s: {
  base1: G2Point; point1: G2Point;
  base2: G2Point; point2: G2Point;
}, p: DLEQProof, t: Transcript): boolean;

// (B+1)-branch OR — "ciphertext encrypts one of the candidates"
export function proveOR(
  ct: Ciphertext,
  r: bigint,
  mpk: G2Point,
  candidates: bigint[],      // {0,...,B} for range proof A; {0,1} for bit proof B
  trueIndex: number,
  t: Transcript,
  commit?: { w?: bigint; simulated?: Array<{ e: bigint; z: bigint }> },
): ORProof;

export function verifyOR(
  ct: Ciphertext,
  mpk: G2Point,
  candidates: bigint[],
  p: ORProof,
  t: Transcript,
): boolean;

// Budget — either an exact-DLEQ on the homomorphic sum, or a (B+1)-OR on the same sum
export function proveBudget(
  ctSum: Ciphertext,
  rSum: bigint,              // = Σ_j r_j (Variant A) or Σ_j Σ_k 2^k r_{j,k} (Variant B)
  budget: bigint,
  mode: "exact" | "atMost",
  mpk: G2Point,
  t: Transcript,
  commit?: { w?: bigint; simulated?: Array<{ e: bigint; z: bigint }> },
): BudgetProof;

export function verifyBudget(
  ctSum: Ciphertext,
  budget: bigint,
  mode: "exact" | "atMost",
  mpk: G2Point,
  p: BudgetProof,
  t: Transcript,
): boolean;
```

The transcript passed in is *not* a private detail — callers construct and seed it with `electionId`, `mpk`, and `vk` so that the proof is bound to this voter in this election. This is the hinge between the proof primitive and the ballot.

#### `schnorr.ts`

```typescript
/** Optional sk: injectable for tests; omitted in production (deviation D-2). */
export function schnorrKeygen(sk?: bigint): { sk: bigint; vk: G1Point };

/** Sign an arbitrary message. For a Ballot the message is
 *  keccak256(electionId ‖ pseudonym ‖ concatenated-ciphertexts ‖ zkProofBytes).
 *  Optional `k`: injectable per-call nonce for tests / deterministic vectors. */
export function schnorrSign(sk: bigint, vk: G1Point, msg: Uint8Array, k?: bigint): SchnorrSig;
export function schnorrVerify(vk: G1Point, msg: Uint8Array, sig: SchnorrSig): boolean;
```

Standard single-point Schnorr over G₁: `R = k·P₁`, `e = H(R ‖ vk ‖ msg)`, `s = k + e·sk`. Verify `s·P₁ == R + e·vk`. Chosen over BLS because the spec asks for it and because verification stays in G₁ without a pairing.

#### `decrypt.ts`

Covers both sides of decryption. Keypers call `partialDecrypt` to produce a `DecryptionShare` payload; everyone else (Tally Aggregator, auditors) consumes those shares via `verifyDecryptionShare`, `combineShares`, and `recoverDiscreteLog`.

```typescript
/** Keyper-only: compute σ_{k,j} = msk_k · C1 and the DLEQ proof that ties σ_{k,j}
 *  to the on-chain committeePK mpk_k = msk_k · P₂. This is the one function the
 *  keyper imports from this SDK. DKG, key storage, and share transport remain
 *  keyper-infrastructure concerns. */
export function partialDecrypt(
  ctSum: Ciphertext,                   // aggregated ciphertext for a candidate
  msk_k: bigint,                       // keyper's secret share — never leaves keyper trust
  mpk_k: G2Point,                      // keyper's public committee key (for transcript binding)
  keyperIndex: number,
  t: Transcript,
): PartialDecryption;

/** Verify a single keyper's DLEQ proof against their on-chain committeePK. */
export function verifyDecryptionShare(
  ctSum: Ciphertext,
  share: PartialDecryption,
  committeePK: G2Point,                // mpk_k from DKGResult.committeePKs
  t: Transcript,
): boolean;

/** Lagrange-combine t+1 verified shares to obtain τ = C2 − σ. */
export function combineShares(
  shares: PartialDecryption[],
  evaluationPoints: bigint[],
  ctSum: Ciphertext,
): G2Point;

/** Baby-step giant-step in G₂: find T such that tau = T · P₂. */
export function recoverDiscreteLog(tau: G2Point, upperBound: bigint): bigint;
```

BSGS runtime / memory is O(√upperBound). For Munich (electorate ≈ a few thousand, B ≤ 10), upper bound ~10⁵, giving ~316 × 316 — sub-second. Ship a precomputable baby-step table keyed by `(P₂, upperBound)`.

**Why `partialDecrypt` lives here and not in a keyper-only package.** The DLEQ primitive it uses is identical to the one the voter-side range proofs use, and identical to the one `verifyDecryptionShare` already implements. Duplicating BLS12-381 + DLEQ in a separate keyper repo would create a second attack surface and a second set of test vectors to maintain. Exposing one additional function — with no orchestration, no key management, no networking — keeps the keyper's SDK dependency minimal while sharing the audited crypto path.

#### `verify.ts`

Ballot-level verification helper used by the Vote Proxy and any auditor. Composes `verifyOR`, `verifyBudget`, `schnorrVerify`, and subgroup checks.

```typescript
/** Primitive-typed input. The consumer destructures their own `Ballot` (from
 *  their ABI layer) into these fields — the SDK does not know about a
 *  contract-shaped `Ballot` object. See deviation D-5. */
export interface BallotInputs {
  electionId: Uint8Array;               // bytes32
  pseudonym: Uint8Array;                 // bytes32, nym_i
  vk: Uint8Array;                        // 48-byte compressed G₁ point
  ciphertexts: [Uint8Array, Uint8Array][]; // each pair is (C1, C2) as 96-byte compressed G₂
  zkProof: Uint8Array;                   // output of encodeBallotValidityProof
  voterSignature: Uint8Array;            // encoded Schnorr signature (R ‖ s)
  wrAttestation: Uint8Array;             // σ_WR — opaque to the SDK
}

/** Election-side parameters the verifier needs. A subset of what the consumer
 *  would pull from their `ElectionConfig` ABI type — only the fields that
 *  actually feed into ballot verification appear here, so the SDK never sees
 *  `phaseDeadlines`, `keyperAddresses`, etc. */
export interface BallotVerifyParams {
  numCandidates: number;                // ℓ
  budget: number;                       // B
  mode: "exact" | "atMost";
  variant: "A" | "B";
  d?: number;                           // Variant B only: bit width, d = ⌈log2(B+1)⌉
}

export function verifyBallot(
  inputs: BallotInputs,
  params: BallotVerifyParams,
  mpk: G2Point,
  verifyWRAttestation: (electionId: Uint8Array, nym: Uint8Array, vk: Uint8Array, att: Uint8Array) => boolean,
): { ok: true } | { ok: false; reason: string };

/** Canonical preimage for the Schnorr signature over a ballot. Both the frontend
 *  (when signing) and the Vote Proxy (when verifying) MUST call this function to
 *  produce identical byte strings. This is the single source of truth for how a
 *  ballot is serialised for signing — no other layer of the stack is allowed to
 *  reconstruct this byte string independently. The caller hashes the returned
 *  preimage (keccak256) before handing it to `schnorrSign` / `schnorrVerify`.
 *
 *  All inputs are already in their on-wire byte form (no `G2Point` here), so
 *  the frontend signer needs nothing but the raw fields it is about to put
 *  on-chain — no round-trip through SDK types. */
export function canonicalBallotMessage(args: {
  electionId: Uint8Array;              // bytes32
  pseudonym: Uint8Array;                // bytes32, nym_i
  ciphertexts: [Uint8Array, Uint8Array][]; // each pair is 96-byte compressed G₂ bytes
  zkProof: Uint8Array;                  // as produced by encodeBallotValidityProof
}): Uint8Array;
```

Steps performed by `verifyBallot`:

1. Sanity-check shape (`ciphertexts.length` matches variant: `ℓ` for A, `ℓ·d` for B).
2. Decode `ciphertexts` → `Ciphertext[]` (subgroup-check each G₂ point via `G2Point.fromBytes`).
3. Decode `vk` → `G1Point` (subgroup-check).
4. Verify `wrAttestation` using the caller-supplied verifier — the WR-Server signature scheme is out of SDK scope, so the caller passes a closure that returns a boolean.
5. Decode `zkProof` → `BallotValidityProof` via `src/contract/codec.ts`.
6. Seed a `Transcript` with domain + `electionId + mpk + vk + ciphertexts`, run `verifyOR` for each range/bit proof, then `verifyBudget` on the homomorphic sum.
7. Reconstruct the signed message via `canonicalBallotMessage`, keccak256 it, decode `voterSignature` via `decodeSchnorr`, and run `schnorrVerify`.

The function returns a reason string on failure so the Vote Proxy can log without leaking vote content (reasons are structural, never value-dependent).

**Canonicalisation rule.** `canonicalBallotMessage` concatenates:

```
"SHUTTER-VOTE-BALLOT-v1" ‖ electionId ‖ pseudonym
  ‖ uint16(ciphertexts.length)
  ‖ for each (C1, C2): C1 bytes ‖ C2 bytes      // already 96-byte compressed
  ‖ uint32(zkProof.length) ‖ zkProof
```

No JSON, no ABI-encoding — raw bytes only, in the order above. The version-tag prefix is how we'd migrate if the ballot schema ever changes. All inputs are already on-wire byte strings, so signer and verifier feed identical material by construction.

### 5.3 Layer 2: zkProof Wire Codec (`src/contract/codec.ts`)

One file. The sole SDK-owned serialisation surface: the encoding for the opaque `bytes` field the contract does not prescribe (`zkProof`), plus small helpers for the two other byte fields the SDK produces (Schnorr signature `R‖s`, DLEQ `(e, z)` used by decryption shares).

```typescript
// src/contract/codec.ts

export function encodeBallotValidityProof(p: BallotValidityProof): Uint8Array;
export function decodeBallotValidityProof(b: Uint8Array, variant: "A" | "B", ℓ: number, B: number, d?: number): BallotValidityProof;

/** DLEQ → 64 raw bytes (e ‖ z, each 32-BE). */
export function encodeDLEQ(p: DLEQProof): Uint8Array;
export function decodeDLEQ(b: Uint8Array): DLEQProof;

/** Schnorr (R, s) → 80 raw bytes (48-byte G₁ compressed ‖ 32-BE scalar). */
export function encodeSchnorr(sig: SchnorrSig): Uint8Array;
export function decodeSchnorr(b: Uint8Array): SchnorrSig;
```

**Wire layout for `BallotValidityProof`** — the single opaque `bytes` field the contract does not prescribe:

```
[0]         version           uint8 (0x01)
[1]         variant           uint8 (0x41 'A' or 0x42 'B')
[2..3]      n_outer           uint16  // ℓ for A, ℓ·d for B
[4..]       branch_count[i]   uint16 per outer i (= B+1 for A, 2 for B) — implicit from variant+B+d,
                                      but encoded for forward compatibility
[...]       or_proofs         concat of branches: [a1(96) ‖ a2(96) ‖ e(32) ‖ z(32)]
[...]       budget_tag        uint8 (0x00 exact, 0x01 atMost)
[...]       budget_payload    DLEQ (64 bytes) OR ORProof (branch_count · 256 bytes)
```

No length prefixes per sub-object beyond the header: sizes are fully determined by `(variant, ℓ, B, d)`, which the caller passes into `decodeBallotValidityProof` (derived from their own `ElectionConfig`). The version byte is the compatibility hook.

**Not in scope:** encoding the `Ballot` itself, `DecryptionShare`, `EncryptedTally`, or any other contract struct. Those are ABI concerns owned by the consumer (see D-5).

---

## 6. Development Phases & Milestones

| Phase | Scope | Deliverables | Est. effort |
|---|---|---|---|
| **P0: Scaffolding** | Fork SDK, rename package, strip IBE code, keep BLST + build pipeline | Empty package that builds, loads WASM, smoke-test curve arithmetic | 3–5 days |
| **P1: Curve layer** | `src/crypto/` | Typed `G1Point` / `G2Point` over BLST, bigint scalar helpers, full unit tests, subgroup-check coverage | 1 week |
| **P2: ElGamal core + Schnorr** | `src/voting/encrypt.ts`, `src/voting/schnorr.ts` | Encrypt → homomorphic-sum → threshold-decrypt with mocked shares; Schnorr sign/verify round-trip | 1 week |
| **P3: Transcript + DLEQ + OR** | `src/voting/transcript.ts`, DLEQ and OR in `src/voting/proofs.ts` | Completeness, soundness, and tamper-negative tests for DLEQ and `(B+1)`-OR | 1.5 weeks |
| **P4: Range / bit / budget proofs** | Rest of `src/voting/proofs.ts` | Variant A range proof for B up to 10; Variant B bit proof; exact and at-most budget | 1 week |
| **P5: Decrypt side** | `src/voting/decrypt.ts` | Verify keyper DLEQ shares; combine t+1; BSGS DLOG recovery with precomputed table | 1 week |
| **P6: Ballot verification** | `src/voting/verify.ts` | End-to-end: frontend builds ciphertexts + `zkProof`, `verifyBallot` accepts; tampered variants rejected | 1 week |
| **P7: Contract codec** | `src/contract/` | Round-trip encode/decode of `zkProof` bytes, `DLEQProofBytes`, Schnorr sig; fuzzing | 3–5 days |
| **P8: Benchmarks** | `benchmarks/` | Timing: encrypt, proof gen / verify, aggregate, decrypt. Proof sizes per variant. | 3 days |
| **P9: Cross-impl test vectors** | JSON vectors | Independent re-verifier in Rust or Go against identical vectors | 1 week |

**Total:** ~7–8 weeks for a single focused engineer. The schedule is kept tight by the design principles in §0 — no DKG, no wire formats, no builders, no service-wrapper APIs.

---

## 7. Test Strategy

### 7.1 Unit

Curve: known-answer against BLST test vectors; roundtrip serialisation.
ElGamal: `decrypt(encrypt(m)) = m`; additive homomorphism; re-encryption with different `r` decrypts identically.
DLEQ: completeness; wrong witness rejected; any transcript input change rejects.
OR: completeness; simulated branches indistinguishable from real branch in verifier's view; tamper-negative per branch.
Schnorr: completeness; forged signature rejected; signature bound to message.

### 7.2 Property-Based (`fast-check`)

For random `m ∈ {0,...,B}`, random `r`: `verifyOR(encrypt(m, mpk), …, true_index=m) = true`.
For random vote vector satisfying budget: `verifyBallot(ballot) = ok`.
For any 1-bit flip in a valid ballot's ciphertext or proof: `verifyBallot = fail`.

### 7.3 Adversarial

- **Ballot copying** across voters: substituting V2's `vk` into V1's ballot must fail (transcript binds to `vk`).
- **Out-of-range vote**: `Enc(B+1)` — proof construction must throw locally, and a hand-forged attempt must fail verification.
- **Budget overflow**: vote vector summing to `B+1` — rejected.
- **Malleability**: doubling `(C1, C2)` to `(2·C1, 2·C2)` — Schnorr signature over the changed ciphertext bytes fails.
- **Small-subgroup**: crafted G₂ element outside prime-order subgroup — `G2Point.fromBytes` rejects.
- **Cross-election replay**: ballot from election X submitted to election Y — transcript includes `electionId`, so the proof fails.

### 7.4 End-to-End

A single test simulating Phases 0–5 of HL_ARC: `n=5, t=2, ℓ=15, B=10, p=100`, asserting correct per-candidate totals after homomorphic aggregation and threshold decryption. DKG is stubbed (not in SDK scope) — the test synthesises `(mpk, mpk_k, msk_k)` via a trusted in-test simulator.

---

## 8. Scope Decisions — Rationale

Two scope edges merit explicit rationale because they look like exceptions to principles 5 and 4 in §0 but are not. The outcomes are already reflected in the function signatures in §5.2; this section records *why* each exists.

### 8.1 Partial decryption lives in the SDK

**Decision:** `partialDecrypt` is an exported SDK function (§5.2, `src/voting/decrypt.ts`).

**Rationale.** The blockchain spec says the keyper writes `DecryptionShare { shares, proofs }` in Phase 5. Producing each `σ_{k,j} = msk_k · (res_j^enc)_1` and the DLEQ proof that proves it corresponds to the published `mpk_k` is a *crypto* step, not a networking step — it uses the same BLST curve layer and the same `proveDLEQ` primitive the SDK already ships for voter-side proofs. Re-implementing BLS12-381 + DLEQ in a separate keyper repo would double the attack surface and require two sets of test vectors to maintain. Shutter's production keypers already depend on the IBE SDK's BLST layer; the same pattern applies here.

**What the SDK keeps out of keyper scope:** DKG, key storage, share transport, networking, committee management. Only the one pure function is shared.

### 8.2 Builder removal confirmed; `canonicalBallotMessage` is an SDK function

**Decision.** No ballot builder. The frontend assembles the on-chain `Ballot` struct itself. `canonicalBallotMessage` is an exported SDK function (§5.2, `src/voting/verify.ts`) — **a plain function callable from any SDK consumer**, not an API, not a class, not a service wrapper. Both the frontend (when signing) and the Vote Proxy (when verifying) call this function to produce identical byte strings for the Schnorr preimage.

**Frontend orchestration, explicit list of SDK calls it makes** (all of them plain function imports):

- choose `variant` ("A" or "B") from the election config
- call `encrypt(v_j, mpk)` for each candidate (Variant A) or each bit (Variant B), collecting `{ct_j, r_j}`
- for Variant B, compute each candidate ciphertext `ĉ_j` via `scalarMulCt` + `addCt`
- seed a `Transcript` with `(electionId, mpk, vk, all-ciphertexts)`
- call `proveOR` per candidate/bit and `proveBudget` on the sum
- `encodeBallotValidityProof(...)` → `zkProof: Uint8Array`
- `canonicalBallotMessage({electionId, pseudonym, ciphertexts, zkProof})` → `Uint8Array` preimage; the frontend then `keccak256`-hashes it and calls `schnorrSign`
- assemble a `Ballot` struct against the contract ABI and hand to the Vote Proxy

Seven SDK function calls plus one hash. Still tight; still entirely the frontend's orchestration. If the frontend team wants a wrapper for testability, that wrapper lives in the web-app repo.

**Why `canonicalBallotMessage` exists at all.** It is not a builder — it does not construct, validate, or submit anything. It is a single pure function that returns the exact byte string the Schnorr signature is computed over. Without it, two independent implementations of "concatenate these fields in this order" would drift and every vote would be rejected. With it, the canonical encoding lives in one place, is unit-tested once, and is re-used by every caller (frontend signer, Vote Proxy verifier, auditor).

---

## 9. Security Review Checklist

- All randomness uses CSPRNG (WebCrypto / Node `crypto`); no `Math.random()`.
- Scalar arithmetic uses bigint + `modQ` (see deviation D-1); not constant-time, but only public-challenge scalars and ephemeral randomness pass through it. BLST's constant-time point-mul handles all secret-scalar exposure. No early-return equality on secrets.
- Fiat–Shamir transcripts bind `electionId`, `mpk`, `vk`, ciphertexts, every commitment.
- Every G₁ / G₂ point deserialised from bytes passes subgroup check before use.
- Wide reduction for hash-to-scalar (≥ 512 bits → mod q).
- Error messages structural only; never mention vote values.
- `blst.js` / `blst.wasm` integrity checked via SRI when loaded in browser.
- External cryptographic review of DLEQ, OR-proof, and budget proof constructions before production.
- Canonical signed-message helper shared with the Vote Proxy via test vectors.

---

## 10. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Browser proof-gen slow for Variant A with large B | Slow vote UX | Benchmark at P4; Web Worker; prefer Variant B for large B |
| BLST WASM initial load size | Voter dropout | Already a known issue; lazy load |
| Frontend signed-message canonicalisation diverges from Vote Proxy | All votes rejected | Ship `canonicalBallotMessage` + cross-impl test vectors (P9) |
| BSGS table memory on low-end devices | N/A for voter; tally runs server-side | Constrain BSGS to server / auditor use |
| Transcript input order drifts between prover and verifier | All proofs fail | Single source of truth: `verify.ts` constructs the transcript; proof functions receive it |

---

## 11. Reuse at a Glance

| Asset | Status | Notes |
|---|---|---|
| BLST WASM | **Keep** | Foundation |
| Browser asset pipeline | **Keep** | Docs carry over |
| Build / test scaffolding | **Keep** | Minor config tweaks |
| `encryptData` / `decrypt` (IBE) | **Remove** | Wrong scheme |
| Curve type wrappers | **Add** | `src/crypto/curve.ts` |
| Hash-to-scalar | **Add** | `src/crypto/hash.ts` |
| ElGamal encrypt + homomorphic ops | **Add** | `src/voting/encrypt.ts` |
| Fiat–Shamir transcript | **Add** | `src/voting/transcript.ts` |
| DLEQ / OR / range / bit / budget proofs | **Add** | `src/voting/proofs.ts` |
| Schnorr | **Add** | `src/voting/schnorr.ts` |
| Decrypt-side combine + BSGS | **Add** | `src/voting/decrypt.ts` |
| Keyper `partialDecrypt` (single pure function, no orchestration) | **Add** | `src/voting/decrypt.ts` |
| Ballot verification | **Add** | `src/voting/verify.ts` |
| `canonicalBallotMessage` (plain SDK function, shared preimage for Schnorr) | **Add** | `src/voting/verify.ts` |
| Contract type mirrors + codec | **Add** | `src/contract/` |
| ~~DKG~~ | **Out of scope** | Keyper infrastructure owns this |
| ~~Wire formats~~ | **Out of scope** | On-chain contract structs are the wire format |
| ~~Ballot builders~~ | **Out of scope** | Frontend composes the `Ballot` struct |
| ~~High-level Voter / Keyper APIs~~ | **Out of scope** | SDK exposes functions |

---

## 12. Next Actions

1. Fork `shutter-network/shutter-sdk` → `shutter-network/shutter-voting-sdk`.
2. Execute P0 + P1 to land the curve layer and cut an early alpha release so downstream frontend work can proceed against typed BLST wrappers.
3. Commission external review of DLEQ / OR-proof / budget proof constructions in parallel with P3–P4.
4. Publish `canonicalBallotMessage` test vectors so the frontend signer and Vote Proxy verifier cannot drift.
5. Publish `partialDecrypt` test vectors so any alternative keyper implementation can cross-check against the SDK.
