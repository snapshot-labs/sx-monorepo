# @snapshot-labs/private-vote-sdk

> Vendored fork of [Urban-Verified/shutter-voting-sdk](https://github.com/Urban-Verified/shutter-voting-sdk) at upstream commit `17dcaf5`. Used by Snapshot's permanent private voting (`privacy: 'shutter-elgamal'`) for client-side ballot construction and ballot / decryption-share verification.
>
> The cryptography is upstream's; only the package name, build script (cross-platform wasm copy), and integration shims are local. The TS<->Python parity gate at `scripts/parity-gate.mjs` (monorepo root) version-locks this against the byte-compatible Python backend in `Urban-Verified/thresholdELGamal`. Run `node scripts/parity-gate.mjs` before merging changes that touch this package.

---

## Using this from the Snapshot monorepo

The upstream README below installs and imports from `@shutter-network/urban-verified-crypto`.
In this monorepo the same code is published as the workspace package
`@snapshot-labs/private-vote-sdk` (`private: true`). Real callers import from that name:

```ts
import { verifyBallot, initCurves } from '@snapshot-labs/private-vote-sdk';
```

Consumers read compiled output from `packages/private-vote-sdk/dist/`. Run
`bun run build --filter=@snapshot-labs/private-vote-sdk` once after a fresh checkout, or Vite
will fail to resolve the package on the first `bun run dev`.

### Which parts Snapshot uses

| SDK export                                                                       | Snapshot caller                                                       |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `buildBallot` primitives (`encrypt`, `proveOR`, `proveBudget*`, `schnorrSign`)   | `apps/ui/src/helpers/teBallot.ts`                                     |
| `verifyBallot`, `canonicalBallotMessage`, `seedBallotTranscript`                 | `apps/sequencer/src/helpers/te.ts`, `apps/hub/src/te.ts`              |
| `addCt`, `scalarMulCt`, `sumCts` (VP-weighted aggregation, weighted-vote splits) | `apps/sequencer/src/helpers/te.ts`, `apps/ui/src/helpers/teVerify.ts` |
| `verifyDecryptionShare`, `combineShares`, `recoverDiscreteLog`                   | `apps/sequencer/src/helpers/te.ts`, `apps/ui/src/helpers/teVerify.ts` |
| DLEQ transcript label `SHUTTER-VOTE-DECRYPT-v1`                                  | mirrored byte-for-byte in `services/keypers/src/sdk_compat.py`        |

### DKG lives outside this SDK

`partialDecrypt` and `verifyDecryptionShare` are the only keyper-side primitives the SDK
carries. The full committee lifecycle (Feldman VSS DKG, share persistence, keyper HTTP
orchestration, auto-DKG coordinator) is implemented in Python under `services/keypers/`.
When something in the decryption path breaks, check both sides: the wire format is fixed by
shared test vectors, not by either language.

### Cross-language parity

`services/keypers/src/sdk_compat.py` reimplements the primitives this SDK exposes so the
keyper produces byte-identical output for the same inputs. The `parity/` vectors under the
monorepo root pin the wire format for both sides. Any change to a transcript label, byte
layout, scalar encoding, or DLEQ construction must land alongside the matching Python change
plus a passing `node scripts/parity-gate.mjs` run.

### `initCurves()` in long-running server processes

The security note below tells you to call `initCurves()` at startup. In a server this is
easy to miss: a tally worker that only aggregates and decrypts (never handles a raw ballot)
still needs BLST initialised, or the first curve op crashes with `BLST not initialised`.
Call `initCurves()` (or the `ensureCurvesInit()` wrapper the Snapshot helpers ship) at
process boot, not lazily on first use.

### BSGS upper bound scales with weighted budgets

`recoverDiscreteLog` is `O(√upperBound)`. In Snapshot's weighted flow the effective bound
is `total_vp × TE_WEIGHTED_BUDGET` (default budget = 100 for percentage splits). Large
proposals push the baby-step table into the millions of entries, so run
`buildBabyStepTable` once per tally and share it across the `ℓ` candidate recoveries; the
sequencer already does this at `apps/sequencer/src/helpers/te.ts`.

---

# Shutter Voting SDK

TypeScript SDK for client-side encrypted voting on the Shutter Network. Implements linearly homomorphic threshold ElGamal over BLS12-381 with zero-knowledge proofs of vote validity and correct partial decryption, per the Munich _Personalratswahl_ cryptographic protocol specification.

Forked from [`@shutter-network/shutter-sdk`](https://github.com/shutter-network/shutter-sdk); shares the BLST WASM layer.

---

## Table of contents

- [What this SDK is (and isn't)](#what-this-sdk-is-and-isnt)
- [Install & setup](#install--setup)
- [Asset placement (browser)](#asset-placement-browser)
- [High-level flow](#high-level-flow)
- [API surface](#api-surface)
  - [Curve primitives](#curve-primitives)
  - [Fiat–Shamir transcript](#fiatshamir-transcript)
  - [ElGamal encryption & homomorphic ops](#elgamal-encryption--homomorphic-ops)
  - [Schnorr signatures](#schnorr-signatures)
  - [Zero-knowledge proof constructors](#zero-knowledge-proof-constructors)
  - [Ballot validity proofs](#ballot-validity-proofs)
  - [Ballot-level verification](#ballot-level-verification)
  - [Wire codecs](#wire-codecs)
  - [Keyper partial decryption](#keyper-partial-decryption)
  - [Aggregation & tally recovery](#aggregation--tally-recovery)
- [Variants A and B](#variants-a-and-b)
- [Security notes](#security-notes)
- [Testing & building](#testing--building)
- [References](#references)

---

## What this SDK is (and isn't)

**In scope**

- ElGamal encryption in G₂ on BLS12-381, with homomorphic addition, scalar multiplication, and a canonical sum.
- Schnorr signatures in G₁ for voter-to-ballot binding.
- A Fiat–Shamir `Transcript` type with Merlin-style challenge fold-back.
- Zero-knowledge proof **constructors** for voters — OR-composition (range / bit) and budget (exact / at-most) — plus a single `verifyBallot` entry point that composes every matching verifier for Vote Proxy and auditor roles.
- Wire encoders for the opaque `bytes` fields the on-chain contract leaves unspecified (`zkProof`, Schnorr signature, decryption-share DLEQ), and a matching `decodeDLEQ` for tally / auditor roles that consume on-chain decryption shares.
- **One** keyper primitive — `partialDecrypt` — plus share verification, Lagrange combination, and baby-step-giant-step (BSGS) discrete-log recovery for the final tally.

**Out of scope**

- Distributed key generation (DKG), keyper key storage, keyper networking/orchestration.
- Contract-struct types or any ABI layer — the consumer owns their `Ballot` / `ElectionConfig` / `DecryptionShare` shapes and destructures them into the primitive-typed inputs the SDK expects.
- `Voter` / `Keyper` classes or service wrappers. The SDK exposes plain ballot-construction and verification functions; callers compose what they need.
- Scalar / field arithmetic, hash-to-scalar, and bare Chaum–Pedersen DLEQ primitives. These are implementation details of `encrypt` / `proveOR` / `partialDecrypt` / `verifyBallot`; the SDK is organised around ballot and proof _operations_, not their scalar building blocks.
- WR-Server attestation verification — you inject a `WRAttestationVerifier` closure into `verifyBallot`.

---

## Install & setup

```bash
npm install @shutter-network/urban-verified-crypto viem
```

`viem` is used for `keccak256`. The SDK depends on a BLST WASM build; it must be initialised once at startup before any curve or proof call:

```ts
import { initCurves } from '@shutter-network/urban-verified-crypto';

await initCurves();
```

## Asset placement (browser)

If you use this SDK in a browser, `blst.js` and `blst.wasm` must be reachable at `/blst.js` and `/blst.wasm`. Both files ship in `dist/`.

```
my-app/
├── public/
│   ├── blst.js
│   └── blst.wasm
```

### Vite

```ts
export default defineConfig({
  optimizeDeps: {
    exclude: ['@shutter-network/urban-verified-crypto']
  }
});
```

---

## High-level flow

A Munich-style ballot passes through these stages:

1. **Voter (browser).** For each of `ℓ` candidates, pick a vote `v_j ∈ {0,…,B}`, encrypt it under the master public key `mpk`, then produce a `BallotValidityProof` (per-candidate range proof + aggregate budget proof) and sign a canonical preimage with Schnorr.
2. **Vote Proxy / auditor.** Call `verifyBallot`, which decodes the proof, runs every range proof, aggregates the ciphertexts, verifies the budget proof on the sum, and checks the Schnorr signature.
3. **Tally Aggregator.** Homomorphically sum active per-voter ciphertexts per candidate.
4. **Keypers (≥ t+1).** Each keyper calls `partialDecrypt(ctSum, …)` to publish an on-chain decryption share with a DLEQ proof binding the share to their committee public key.
5. **Tally Aggregator / auditor.** `verifyDecryptionShare` each share, `combineShares` via Lagrange interpolation, then `recoverDiscreteLog` (BSGS in G₂) to obtain the plaintext candidate totals.

---

## API surface

All exports below come from the package root:

```ts
import {} from /* … */ '@shutter-network/urban-verified-crypto';
```

### Curve primitives

Typed G₁ / G₂ wrappers around BLS12-381. Subgroup checks run on every `fromBytes` so downstream code can trust any point it holds. Scalars pass through the API as plain `bigint`s — scalar arithmetic, hash-to-scalar, and domain-separation are handled internally by `encrypt`, `proveOR`, `partialDecrypt`, and the other operations below.

```ts
class G1Point {
  static generator(): G1Point;
  static fromBytes(bytes: Uint8Array): G1Point; // 48-byte compressed; runs subgroup check
  toBytes(): Uint8Array; // 48 bytes
  add(other: G1Point): G1Point;
  mul(scalar: bigint): G1Point;
  equals(other: G1Point): boolean;
}

class G2Point {
  static generator(): G2Point;
  static fromBytes(bytes: Uint8Array): G2Point; // 96-byte compressed; runs subgroup check
  toBytes(): Uint8Array; // 96 bytes
  add(other: G2Point): G2Point;
  mul(scalar: bigint): G2Point;
  equals(other: G2Point): boolean;
}

const G1_BYTES = 48;
const G2_BYTES = 96;
```

### Fiat–Shamir transcript

Merlin-style, length-prefixed, with automatic challenge fold-back — the transcript is the single source of truth for every challenge in every proof.

```ts
class Transcript {
  constructor(label: string);
  append(tag: string, bytes: Uint8Array): void;
  appendScalar(tag: string, x: bigint): void;
  appendPoint(tag: string, p: G1Point | G2Point): void;
  challenge(tag: string): bigint; // folds the challenge back into the transcript
  clone(): Transcript;
}
```

### ElGamal encryption & homomorphic ops

Linearly homomorphic threshold ElGamal in G₂:

```
C1 = r · P₂
C2 = r · mpk + m · P₂
```

```ts
interface Ciphertext {
  c1: G2Point;
  c2: G2Point;
}

function encrypt(
  m: bigint,
  mpk: G2Point,
  r?: bigint
): { ct: Ciphertext; r: bigint };
function addCt(a: Ciphertext, b: Ciphertext): Ciphertext;
function scalarMulCt(a: Ciphertext, k: bigint): Ciphertext;
function sumCts(cts: readonly Ciphertext[]): Ciphertext;
```

`r` is optional; omitting it draws a fresh scalar. The returned `r` is the randomness the prover re-uses as the witness for range and budget proofs.

### Schnorr signatures

Standard single-point Schnorr over G₁. Used to bind a ballot to a voter's ephemeral verification key `vk = sk · P₁`.

```ts
interface SchnorrSig {
  R: G1Point;
  s: bigint;
}

function schnorrKeygen(): { sk: bigint; vk: G1Point };
function schnorrSign(
  sk: bigint,
  vk: G1Point,
  msg: Uint8Array,
  k?: bigint
): SchnorrSig;
function schnorrVerify(vk: G1Point, msg: Uint8Array, sig: SchnorrSig): boolean;
```

The signed `msg` is the `keccak256` of the bytes returned by [`canonicalBallotMessage`](#ballot-level-verification) — don't assemble the preimage by hand.

### Zero-knowledge proof constructors

Voter-side prover functions. Every prover seeds a shared `Transcript` with public inputs; the same transcript is re-used across the per-candidate range / bit proofs and the aggregate budget proof so they compose into a single `BallotValidityProof`. Proofs are deterministic given injected commitment randomness (see the optional `commit` params), which keeps test vectors and fuzzing tractable.

Verifier-side roles (Vote Proxy, auditor) do **not** invoke these per-proof — they call [`verifyBallot`](#ballot-level-verification), which re-seeds the transcript the same way and runs every sub-proof in one pass. Keyper decryption shares are verified via [`verifyDecryptionShare`](#keyper-partial-decryption).

```ts
interface DLEQProof {
  e: bigint;
  z: bigint;
}
interface ORProof {
  branches: { a1: G2Point; a2: G2Point; e: bigint; z: bigint }[];
}

type BudgetProof =
  | { mode: 'exact'; proof: DLEQProof }
  | { mode: 'atMost'; proof: ORProof };
```

**OR composition** — proves a ciphertext `(C1, C2)` encrypts _one_ of a fixed candidate set without revealing which. Used for both Variant A range proofs (candidate set `{0,…,B}`) and Variant B bit proofs (candidate set `{0,1}`).

```ts
interface ORStatement {
  ct: Ciphertext;
  mpk: G2Point;
  candidates: readonly bigint[];
}
interface ORWitness {
  r: bigint;
  trueIndex: number;
}
interface ORCommitments {
  w?: bigint;
  simulated?: ReadonlyArray<{ e: bigint; z: bigint } | undefined>;
}

function proveOR(
  stmt: ORStatement,
  witness: ORWitness,
  t: Transcript,
  commit?: ORCommitments
): ORProof;
```

**Budget proofs** — bind the aggregate ciphertext `cΣ = Σ_j c_j` to a budget `B`. The mode byte is bound into the transcript, so an `exact` proof cannot be reinterpreted as an `atMost` proof even when `V = B`.

```ts
interface BudgetStatement {
  ctSum: Ciphertext;
  mpk: G2Point;
  budget: bigint;
}
interface ExactBudgetWitness {
  rSum: bigint;
}
interface AtMostBudgetWitness {
  rSum: bigint;
  V: bigint;
}

function proveBudgetExact(
  stmt: BudgetStatement,
  w: ExactBudgetWitness,
  t: Transcript,
  commit?: { w?: bigint }
): BudgetProof;
function proveBudgetAtMost(
  stmt: BudgetStatement,
  w: AtMostBudgetWitness,
  t: Transcript,
  commit?: ORCommitments
): BudgetProof;
```

### Ballot validity proofs

A `BallotValidityProof` bundles every per-candidate range / bit proof and the aggregate budget proof into one object, wire-encodable as a single `bytes` field on the ballot.

```ts
interface BallotValidityProof {
  version: number; // 0x01
  variant: 'A' | 'B';
  rangeOrBit: ORProof[]; // Variant A: ℓ proofs each with B+1 branches.
  // Variant B: ℓ·d bit proofs each with 2 branches.
  budget: BudgetProof;
}
```

See [Variants A and B](#variants-a-and-b) for when to pick each.

### Ballot-level verification

`verifyBallot` is the one-call entry point for Vote Proxy / auditor roles. It decodes the `zkProof`, validates every sub-proof, checks the homomorphic sum against the budget, verifies the Schnorr signature, and invokes a caller-supplied WR-Server attestation verifier.

```ts
interface BallotInputs {
  electionId: Uint8Array; // bytes32
  pseudonym: Uint8Array; // bytes32 nym_i
  vk: Uint8Array; // 48-byte compressed G₁
  ciphertexts: ReadonlyArray<readonly [Uint8Array, Uint8Array]>; // each pair = (C1, C2), 96 bytes each
  zkProof: Uint8Array; // encodeBallotValidityProof output
  voterSignature: Uint8Array; // encodeSchnorr output (80 bytes)
  wrAttestation: Uint8Array; // opaque σ_WR — handed to your verifier
}

interface BallotVerifyParams {
  numCandidates: number; // ℓ
  budget: number; // B
  mode: 'exact' | 'atMost';
  variant: 'A' | 'B';
  d?: number; // Variant B only: ⌈log2(B+1)⌉
}

type WRAttestationVerifier = (
  electionId: Uint8Array,
  pseudonym: Uint8Array,
  vk: Uint8Array,
  attestation: Uint8Array
) => boolean;

type VerifyResult = { ok: true } | { ok: false; reason: string };

function verifyBallot(
  inputs: BallotInputs,
  params: BallotVerifyParams,
  mpk: G2Point,
  verifyWRAttestation: WRAttestationVerifier
): VerifyResult;

// Canonical Schnorr preimage — use this on both the signer and verifier sides.
function canonicalBallotMessage(args: {
  electionId: Uint8Array;
  pseudonym: Uint8Array;
  ciphertexts: ReadonlyArray<readonly [Uint8Array, Uint8Array]>;
  zkProof: Uint8Array;
}): Uint8Array;

// Shared transcript seeding used by both prover and verifier.
function seedBallotTranscript(
  electionId: Uint8Array,
  mpk: G2Point,
  vk: G1Point,
  ciphertexts: readonly Ciphertext[],
  params: BallotVerifyParams
): Transcript;

// Candidate set for a Variant A range proof: [0n, 1n, …, Bn].
function rangeCandidates(budget: number): bigint[];
```

Destructure your own `Ballot` struct (from your ABI / contract layer) into `BallotInputs`; the SDK does not own any contract-shaped type. Passing the raw byte fields lets the consumer pick any serializer (ethers, viem, abitype) without coupling to ours.

### Wire codecs

The `bytes` fields the on-chain contract leaves opaque. Voters, keypers, and any other producer role encode once on the way onto the wire; `verifyBallot` handles every ballot-side decode internally, so the only decoder the public surface exposes is `decodeDLEQ` — needed by the Tally Aggregator and auditors to consume keyper decryption-share proofs that they did not themselves construct.

```ts
function encodeBallotValidityProof(p: BallotValidityProof): Uint8Array;

function encodeDLEQ(p: DLEQProof): Uint8Array; // 64 bytes: 32-BE e ‖ 32-BE z
function decodeDLEQ(b: Uint8Array): DLEQProof; // strict: wrong length throws

function encodeSchnorr(sig: SchnorrSig): Uint8Array; // 80 bytes: 48-byte R ‖ 32-BE s
```

### Keyper partial decryption

The keyper's entire import surface. DKG, key storage, and share transport remain keyper-infrastructure concerns.

```ts
interface PartialDecryption {
  sigma: G2Point; // σ_{k,j} = msk_k · C1
  proof: DLEQProof; // DLEQ tying σ to committeePK = msk_k · P₂
  keyperIndex: number;
}

function partialDecrypt(
  ctSum: Ciphertext,
  msk_k: bigint,
  mpk_k: G2Point,
  keyperIndex: number,
  t: Transcript
): PartialDecryption;

function verifyDecryptionShare(
  ctSum: Ciphertext,
  share: PartialDecryption,
  committeePK: G2Point,
  t: Transcript
): boolean;
```

### Aggregation & tally recovery

```ts
// Lagrange-combine any t+1 verified shares → τ = C2 − σ.
function combineShares(
  shares: PartialDecryption[],
  evaluationPoints: bigint[],
  ctSum: Ciphertext
): G2Point;

// Baby-step-giant-step in G₂: find T such that τ = T · P₂.
// Runtime & memory O(√upperBound). Munich-scale: ~10^5 upper bound → sub-second.
function recoverDiscreteLog(tau: G2Point, upperBound: bigint): bigint;

// Hoist the baby-step table when recovering many plaintexts against the
// same bound (the Tally Aggregator's hot path: one table, ℓ candidates).
interface BabyStepTable {
  /* opaque; reuse as-is */
}
function buildBabyStepTable(upperBound: bigint): BabyStepTable;
function recoverDiscreteLogWithTable(
  tau: G2Point,
  table: BabyStepTable
): bigint;
```

---

## Variants A and B

Two range-proof shapes are supported, picked at election-config time:

| Variant | Per-candidate proof                                | Branches | Ballot proof size       | When to pick                                         |
| ------- | -------------------------------------------------- | -------- | ----------------------- | ---------------------------------------------------- |
| **A**   | `(B+1)`-branch OR over {0,…,B}                     | `B+1`    | `ℓ · (B+1)` OR branches | Small budgets `B` (Munich default).                  |
| **B**   | `d` bit-proofs over {0,1}, where `d = ⌈log2(B+1)⌉` | `2`      | `ℓ · d` OR branches     | Large budgets where `(B+1) > d`, i.e. `B ≥ 3` or so. |

Both variants are fully wired end-to-end — prover, verifier, codec, and benchmarks. `seedBallotTranscript` binds `variant` and (for B) `d` into the transcript so an A-ballot cannot be re-interpreted as a B-ballot at the same parameters.

---

## Security notes

- **Always call `initCurves()` before anything else.** Every point and proof path assumes the WASM layer is live.
- **Subgroup checks are automatic.** `G1Point.fromBytes` / `G2Point.fromBytes` reject non-subgroup points, so `verifyBallot` gets them for free when decoding `vk` and ciphertexts.
- **Don't reconstruct the Schnorr preimage by hand.** Always call `canonicalBallotMessage` on both the signer and verifier side. Any drift silently invalidates every ballot.
- **Transcript binding is load-bearing.** `seedBallotTranscript` binds `vk`, `electionId`, `mpk`, variant / mode / budget, and every ciphertext. Skipping any of these enables cross-ballot replay.
- **The SDK never sees your contract structs.** Destructure your own `Ballot` and `ElectionConfig` into the primitive shapes. No contract-struct mirror lives here by design (see D-5 in the dev plan).
- **WR-Server attestation is out of scope.** Inject a `WRAttestationVerifier` closure — the SDK never tries to guess your attestation scheme.

---

## Testing & building

```bash
npm test              # jest — unit, property-based, end-to-end, + vector re-verify
npm run bench         # jest w/ --expose-gc over benchmarks/*.bench.ts
npm run gen-vectors   # regenerate tests/vectors/**/*.json deterministically
npm run build         # tsup + copies blst.wasm into dist/
```

**Benchmarks** under [`benchmarks/`](benchmarks/): `primitives.bench.ts`, `ballot-variant-{a,b}.bench.ts`, `decrypt.bench.ts`, `e2e.bench.ts`. The full-scale HL_ARC `p=100` e2e is marked `describe.skip` pending a blst WASM rebuild with `ALLOW_MEMORY_GROWTH` (see inline comment in [benchmarks/e2e.bench.ts](benchmarks/e2e.bench.ts)).

**Cross-impl test vectors** under [`tests/vectors/`](tests/vectors/): JSON per primitive (encrypt, DLEQ, OR, budget, Schnorr, decrypt-share, ballot, tally), consumed by `tests/voting.vectors.test.ts` and intended for an independent re-verifier in another language. Schema in [tests/vectors/\_schema.ts](tests/vectors/_schema.ts); generator in [scripts/gen-vectors.ts](scripts/gen-vectors.ts).

---

## References

- Munich _Personalratswahl_ cryptographic protocol specification (v0.3).
- Potential Extensions document (Variant B, binary decomposition, WR-Server integration).
- [docs/development-plan.md](docs/development-plan.md) — phase-by-phase implementation plan, deviations, and rationale.
