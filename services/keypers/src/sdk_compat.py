"""
shutter-voting-sdk wire-compatible primitives — Python port.

Ports the subset of the SDK we need so this repo's voter, keyper, and
backend produce/verify bytes that interoperate with the SDK byte-for-byte.
See ``PLAN.md`` §6 — Option 1.

What lives here:

  * ``Transcript``                 — Merlin-style length-prefixed transcript
                                     with dual-keccak challenge derivation.
  * ``prove_decryption_share`` /
    ``verify_decryption_share``    — keyper DLEQ in SDK transcript shape.
  * ``encode_dleq`` / ``decode_dleq``  — 64-byte ``e ‖ z`` wire form.
  * Schnorr (``schnorr_keygen`` /
    ``schnorr_sign`` / ``schnorr_verify`` /
    ``encode_schnorr`` / ``decode_schnorr``) — voter signature scheme on G1.
  * OR proofs (``prove_or`` /
    ``verify_or``)                 — (B+1)-branch disjunction over Variant-A
                                     range proofs and ``atMost`` budget.
  * Exact-budget DLEQ on G2
    (``prove_budget_exact`` /
    ``verify_budget_exact``)       — Σvⱼ = B over the homomorphic sum.
  * Ballot validity proof codec
    (``encode_ballot_validity_proof`` /
    ``decode_ballot_validity_proof``).
  * ``canonical_ballot_message``   — exact preimage bytes the voter signs.
  * ``seed_ballot_transcript``     — shared transcript seeding for prover
                                     and verifier.
  * High-level ``build_ballot`` /
    ``verify_ballot``              — voter wrapper + ballot verifier.

The legacy SHA-256 transcript in ``crypto.proofs.prove_decryption_share``
is left untouched — the existing pure-Python tests still depend on it.
The on-chain path uses *this* module instead so SDK consumers can verify
our shares + ballots.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Iterable, Sequence

from eth_utils import keccak

from py_arkworks_bls12381 import G1Point, G2Point, Scalar

from crypto.primitives import (
    CURVE_ORDER,
    G1,
    G2,
    Z1,
    Z2,
    g1_from_compressed,
    g1_to_compressed,
    g2_from_compressed,
    g2_to_compressed,
    point_eq,
    point_multiply,
    random_scalar,
)


# ---------------------------------------------------------------------------
#  Transcript
#
#  Mirrors src/voting/transcript.ts and src/crypto/hash.ts in the SDK.
#  The transcript holds a list of byte slices; ``challenge`` derives a
#  scalar by dual-keccaking those slices with a domain-separation prefix
#  and then folds the result back in via ``append_scalar(tag + ":chal", e)``
#  so subsequent appends bind to it.
# ---------------------------------------------------------------------------

_DST_FIAT_SHAMIR = b"SHUTTER-VOTE-FS-v1"


def _u32be(n: int) -> bytes:
    return n.to_bytes(4, "big")


def _u16be(n: int) -> bytes:
    return n.to_bytes(2, "big")


def _scalar_to_bytes(s: int) -> bytes:
    return (s % CURVE_ORDER).to_bytes(32, "big")


def _wide_reduce(b64: bytes) -> int:
    return int.from_bytes(b64, "big") % CURVE_ORDER


class Transcript:
    """Length-prefixed Fiat-Shamir transcript matching the SDK's ``Transcript``.

    Constructed with a label, then ``append`` / ``append_point`` /
    ``append_scalar`` push tagged byte slices. ``challenge(tag)`` returns a
    scalar in ``[0, CURVE_ORDER)`` and folds it back into the transcript so
    the verifier reproduces the same state.
    """

    def __init__(self, label: str):
        self.parts: list[bytes] = [label.encode("utf-8")]

    # -- raw appenders ------------------------------------------------

    def append(self, tag: str, value: bytes) -> None:
        tb = tag.encode("utf-8")
        self.parts.append(_u32be(len(tb)))
        self.parts.append(tb)
        self.parts.append(_u32be(len(value)))
        self.parts.append(bytes(value))

    def append_point(self, tag: str, point) -> None:
        self.append(tag, g2_to_compressed(point))

    def append_scalar(self, tag: str, s: int) -> None:
        self.append(tag, _scalar_to_bytes(s))

    # -- challenge ----------------------------------------------------

    def challenge(self, tag: str) -> int:
        tb = tag.encode("utf-8")
        head = _DST_FIAT_SHAMIR + _u32be(len(tb)) + tb
        preimage = head + b"".join(self.parts)
        h1 = keccak(b"\x00" + preimage)
        h2 = keccak(b"\x01" + preimage)
        e = _wide_reduce(h1 + h2)
        self.append_scalar(tag + ":chal", e)
        return e


# ---------------------------------------------------------------------------
#  DLEQ wire format (64 bytes: e ‖ z, big-endian 32 each)
# ---------------------------------------------------------------------------

DLEQ_BYTES = 64


def encode_dleq(e: int, z: int) -> bytes:
    return _scalar_to_bytes(e) + _scalar_to_bytes(z)


def decode_dleq(b: bytes) -> tuple[int, int]:
    if len(b) != DLEQ_BYTES:
        raise ValueError(f"Expected {DLEQ_BYTES}-byte DLEQ, got {len(b)}")
    e = int.from_bytes(b[:32], "big")
    z = int.from_bytes(b[32:], "big")
    return e, z


# ---------------------------------------------------------------------------
#  Decryption-share DLEQ
#
#  Proves dlog_{P2}(mpk_k) == dlog_{C1}(sigma) under witness msk_k.
#  Mirrors src/voting/decrypt.ts:
#      bindDecryptionShare(t, ctSum, mpk_k, keyperIndex)
#      proveDLEQ({base1=P2, point1=mpk_k, base2=C1, point2=sigma}, msk_k, t)
# ---------------------------------------------------------------------------

def _bind_decryption_share(t: Transcript, C1, C2, mpk_k, keyper_index: int) -> None:
    t.append_point("dec:C1", C1)
    t.append_point("dec:C2", C2)
    t.append_point("dec:mpk_k", mpk_k)
    t.append("dec:keyperIndex", _u16be(keyper_index))


def _bind_statement_dleq(t: Transcript, base1, base2, point1, point2) -> None:
    t.append_point("dleq:base1", base1)
    t.append_point("dleq:base2", base2)
    t.append_point("dleq:point1", point1)
    t.append_point("dleq:point2", point2)


def prove_decryption_share(
    t: Transcript,
    C1, C2, mpk_k, sigma, msk_k: int, keyper_index: int,
) -> tuple[int, int]:
    """Produce a DLEQ proof under the SDK transcript shape.

    ``t`` is mutated. Returns ``(e, z)`` — the contract's ``DLEQProof``.
    """
    _bind_decryption_share(t, C1, C2, mpk_k, keyper_index)

    w = random_scalar()
    a1 = point_multiply(G2, w)
    a2 = point_multiply(C1, w)

    _bind_statement_dleq(t, base1=G2, base2=C1, point1=mpk_k, point2=sigma)
    t.append_point("dleq:a1", a1)
    t.append_point("dleq:a2", a2)
    e = t.challenge("dleq:e")
    z = (w + msk_k * e) % CURVE_ORDER
    return e, z


def verify_decryption_share(
    t: Transcript,
    C1, C2, mpk_k, sigma, e: int, z: int, keyper_index: int,
) -> bool:
    """Verify a DLEQ produced by :func:`prove_decryption_share`.

    ``t`` is mutated identically to the prover side.
    """
    _bind_decryption_share(t, C1, C2, mpk_k, keyper_index)

    # a1 = z·P2 - e·mpk_k    (because z = w + e·msk_k  ⇒  z·P2 = a1 + e·mpk_k)
    a1 = point_multiply(G2, z) + point_multiply(mpk_k, (-e) % CURVE_ORDER)
    a2 = point_multiply(C1, z) + point_multiply(sigma, (-e) % CURVE_ORDER)

    _bind_statement_dleq(t, base1=G2, base2=C1, point1=mpk_k, point2=sigma)
    t.append_point("dleq:a1", a1)
    t.append_point("dleq:a2", a2)
    e_recomputed = t.challenge("dleq:e")
    return e_recomputed == e


# ---------------------------------------------------------------------------
#  Convenience helpers used by the keyper
# ---------------------------------------------------------------------------

def make_decryption_share(
    C1, C2, mpk_k, msk_k: int, keyper_index: int, *, transcript_label: str,
) -> tuple[bytes, tuple[int, int]]:
    """One-shot helper: returns ``(sigma_compressed, (e, z))``.

    Caller passes the agreed ``transcript_label`` so the verifier can
    reconstruct the same starting state.
    """
    sigma = point_multiply(C1, msk_k)
    t = Transcript(transcript_label)
    e, z = prove_decryption_share(t, C1, C2, mpk_k, sigma, msk_k, keyper_index)
    return g2_to_compressed(sigma), (e, z)


# ---------------------------------------------------------------------------
#  On-chain transcript shape
#
#  The SDK's actor-usage.md §4 specifies how the keyper transcript is seeded
#  for an on-chain decryption-share submission:
#
#      t = Transcript('SHUTTER-VOTE-DECRYPT-v1')
#      t.append('electionId', electionId)   # 32 bytes
#      t.append('candidate',  u16BE(j))     # 2 bytes
#
#  Both prover (keyper) and verifier (tally aggregator / auditor) MUST seed
#  the transcript identically. ``make_onchain_decrypt_transcript`` is the
#  single source of that contract.
# ---------------------------------------------------------------------------

ONCHAIN_DECRYPT_LABEL = "SHUTTER-VOTE-DECRYPT-v1"


def election_id_to_bytes32(election_id: int) -> bytes:
    """Convert a uint256 ``electionId`` (as returned by the contract) to the
    32-byte big-endian form the SDK transcript expects.
    """
    if election_id < 0 or election_id >= 1 << 256:
        raise ValueError(f"electionId {election_id} out of uint256 range")
    return int(election_id).to_bytes(32, "big")


def make_onchain_decrypt_transcript(election_id: int, candidate_index: int) -> Transcript:
    """Build a freshly seeded transcript for on-chain decryption-share DLEQ.

    Mirrors the SDK exactly; the ``Election.submitDecryptionShare`` shares
    produced under this transcript will verify under SDK-built auditors.
    """
    if candidate_index < 0 or candidate_index >= 1 << 16:
        raise ValueError(f"candidate_index {candidate_index} out of u16 range")
    t = Transcript(ONCHAIN_DECRYPT_LABEL)
    t.append("electionId", election_id_to_bytes32(election_id))
    t.append("candidate", _u16be(candidate_index))
    return t


# ---------------------------------------------------------------------------
#  Hash-to-scalar (concatenation form, used outside the Transcript class)
#
#  Mirrors src/crypto/hash.ts:
#      preimage = DST || part0 || part1 || ...
#      h1 = keccak256(0x00 || preimage)
#      h2 = keccak256(0x01 || preimage)
#      return wide_reduce(h1 || h2)  mod CURVE_ORDER
#
#  Note: this is a *concatenation* hasher, distinct from ``Transcript`` which
#  length-prefixes every appended slice. Both share the dual-keccak +
#  wide-reduce challenge derivation.
# ---------------------------------------------------------------------------

def hash_to_scalar(domain_sep: bytes, *parts: bytes) -> int:
    preimage = bytes(domain_sep) + b"".join(bytes(p) for p in parts)
    h1 = keccak(b"\x00" + preimage)
    h2 = keccak(b"\x01" + preimage)
    return _wide_reduce(h1 + h2)


# ---------------------------------------------------------------------------
#  Schnorr signatures over G1 (Munich §5.2)
#
#  Mirrors src/voting/schnorr.ts:
#      sk    ← Z_q  (caller may supply)
#      vk    := sk · P1
#      sign:   k ← Z_q;  R := k · P1;  e := H(R ‖ vk ‖ msg);  s := k + e·sk
#      verify: e := H(R ‖ vk ‖ msg);   accept iff s · P1 == R + e · vk
#
#  H here is ``hash_to_scalar`` with DST = "SHUTTER-VOTE-SCHNORR-v1".
# ---------------------------------------------------------------------------

DST_SCHNORR = b"SHUTTER-VOTE-SCHNORR-v1"
SCHNORR_BYTES = 80   # R(48) ‖ s(32)


def _g1_mul(scalar: int):
    return G1 * Scalar(scalar % CURVE_ORDER)


def _schnorr_challenge(R, vk, msg: bytes) -> int:
    return hash_to_scalar(
        DST_SCHNORR,
        g1_to_compressed(R),
        g1_to_compressed(vk),
        bytes(msg),
    )


def schnorr_keygen(sk: int | None = None) -> tuple[int, "G1Point"]:
    """Generate a Schnorr keypair. ``vk = sk · P1``.

    Identity ``sk`` (i.e. 0 mod Q) is rejected — see the SDK for rationale.
    """
    if sk is None:
        sk = random_scalar()
    sk = sk % CURVE_ORDER
    if sk == 0:
        raise ValueError("schnorr_keygen: sk must be non-zero mod CURVE_ORDER")
    vk = _g1_mul(sk)
    return sk, vk


def schnorr_sign(sk: int, vk, msg: bytes, k: int | None = None) -> tuple["G1Point", int]:
    """Produce ``(R, s)`` such that ``s · P1 == R + e · vk``."""
    if k is None:
        k = random_scalar()
    k = k % CURVE_ORDER
    R = _g1_mul(k)
    e = _schnorr_challenge(R, vk, msg)
    s = (k + e * (sk % CURVE_ORDER)) % CURVE_ORDER
    return R, s


def schnorr_verify(vk, msg: bytes, R, s: int) -> bool:
    """Check that ``s · P1 == R + e · vk`` for ``e = H(R ‖ vk ‖ msg)``.

    Identity ``vk`` is rejected up front — every signature trivially passes
    against it because ``s · P1 == R + e · O = R``.
    """
    if vk == Z1:
        return False
    e = _schnorr_challenge(R, vk, msg)
    lhs = _g1_mul(s)
    rhs = R + (vk * Scalar(e % CURVE_ORDER))
    return lhs == rhs


def encode_schnorr(R, s: int) -> bytes:
    """80-byte SDK wire form: R(48) ‖ s(32)."""
    return g1_to_compressed(R) + _scalar_to_bytes(s)


def decode_schnorr(b: bytes) -> tuple["G1Point", int]:
    if len(b) != SCHNORR_BYTES:
        raise ValueError(f"Expected {SCHNORR_BYTES}-byte Schnorr signature, got {len(b)}")
    R = g1_from_compressed(b[:48])
    s = int.from_bytes(b[48:], "big")
    return R, s


# ---------------------------------------------------------------------------
#  DLEQ on G2 (Chaum-Pedersen) — used by the budget-exact proof
#
#  Statement: { base1, point1 = x·base1, base2, point2 = x·base2 }; witness x.
#
#  Mirrors src/voting/proofs.ts. Note this is *separate* from
#  ``prove_decryption_share`` above, which has its own ``dec:*`` transcript
#  bindings layered on top of the same DLEQ skeleton.
# ---------------------------------------------------------------------------

def _bind_statement_dleq_g2(t: Transcript, base1, point1, base2, point2) -> None:
    t.append_point("dleq:base1", base1)
    t.append_point("dleq:base2", base2)
    t.append_point("dleq:point1", point1)
    t.append_point("dleq:point2", point2)


def prove_dleq_g2(base1, point1, base2, point2, x: int, t: Transcript,
                  *, w: int | None = None) -> tuple[int, int]:
    """Prove ``log_{base1}(point1) == log_{base2}(point2) == x``."""
    if w is None:
        w = random_scalar()
    a1 = point_multiply(base1, w)
    a2 = point_multiply(base2, w)
    _bind_statement_dleq_g2(t, base1, point1, base2, point2)
    t.append_point("dleq:a1", a1)
    t.append_point("dleq:a2", a2)
    e = t.challenge("dleq:e")
    z = (w + x * e) % CURVE_ORDER
    return e, z


def verify_dleq_g2(base1, point1, base2, point2, e: int, z: int, t: Transcript) -> bool:
    # a1 = z·base1 - e·point1 ; a2 = z·base2 - e·point2
    a1 = point_multiply(base1, z) + point_multiply(point1, (-e) % CURVE_ORDER)
    a2 = point_multiply(base2, z) + point_multiply(point2, (-e) % CURVE_ORDER)
    _bind_statement_dleq_g2(t, base1, point1, base2, point2)
    t.append_point("dleq:a1", a1)
    t.append_point("dleq:a2", a2)
    return e == t.challenge("dleq:e")


# ---------------------------------------------------------------------------
#  OR proof — (B+1)-branch disjunction on (C1, C2) ciphertexts
#
#  Statement: ct = (C1, C2) encrypts one of {m_0, ..., m_B} under mpk.
#  Witness:   r (encryption randomness) + true_index.
#
#  Mirrors ``src/voting/proofs.ts:proveOR / verifyOR``.
# ---------------------------------------------------------------------------

def _u32be(n: int) -> bytes:  # already exists below — local alias; harmless re-def avoided
    return n.to_bytes(4, "big")  # noqa: F811


def _bind_statement_or(t: Transcript, c1, c2, mpk, candidates: Sequence[int]) -> None:
    t.append_point("or:P2", G2)
    t.append_point("or:mpk", mpk)
    t.append_point("or:C1", c1)
    t.append_point("or:C2", c2)
    t.append("or:|M|", len(candidates).to_bytes(4, "big"))
    for i, m in enumerate(candidates):
        t.append_scalar(f"or:m[{i}]", m % CURVE_ORDER)


@dataclass
class ORBranch:
    a1: object
    a2: object
    e: int
    z: int


def prove_or(
    c1, c2, mpk, candidates: Sequence[int], r: int, true_index: int,
    t: Transcript, *,
    w: int | None = None,
    simulated: Sequence[tuple[int, int] | None] | None = None,
) -> list[ORBranch]:
    """Build a (len(candidates))-branch OR proof.

    Pinned ``w`` and ``simulated`` (per-branch (e, z) pairs, ``None`` at the
    real branch) reproduce SDK fixtures byte-for-byte.
    """
    n = len(candidates)
    if n == 0:
        raise ValueError("prove_or: candidate set is empty")
    if not (0 <= true_index < n):
        raise ValueError(f"prove_or: true_index {true_index} out of [0, {n})")
    if simulated is None:
        simulated = [None] * n
    if len(simulated) != n:
        raise ValueError(f"prove_or: simulated length {len(simulated)} != candidates {n}")

    # Pass 1: build (a1, a2) per branch.
    branches: list[ORBranch] = [ORBranch(None, None, 0, 0)] * n
    real_w = w if w is not None else random_scalar()
    for i in range(n):
        if i == true_index:
            a1 = point_multiply(G2, real_w)
            a2 = point_multiply(mpk, real_w)
            branches[i] = ORBranch(a1, a2, 0, 0)
        else:
            sim = simulated[i] if simulated[i] is not None else (random_scalar(), random_scalar())
            ei, zi = sim[0] % CURVE_ORDER, sim[1] % CURVE_ORDER
            Di = c2 + point_multiply(G2, (-(candidates[i] % CURVE_ORDER)) % CURVE_ORDER)
            a1 = point_multiply(G2, zi) + point_multiply(c1, (-ei) % CURVE_ORDER)
            a2 = point_multiply(mpk, zi) + point_multiply(Di, (-ei) % CURVE_ORDER)
            branches[i] = ORBranch(a1, a2, ei, zi)

    # Pass 2: aggregate challenge, close real branch.
    _bind_statement_or(t, c1, c2, mpk, candidates)
    for i in range(n):
        t.append_point(f"or:a1[{i}]", branches[i].a1)
        t.append_point(f"or:a2[{i}]", branches[i].a2)
    e_total = t.challenge("or:e")

    sim_sum = 0
    for i in range(n):
        if i != true_index:
            sim_sum += branches[i].e
    e_real = (e_total - sim_sum) % CURVE_ORDER
    z_real = (real_w + r * e_real) % CURVE_ORDER
    branches[true_index] = ORBranch(
        branches[true_index].a1, branches[true_index].a2, e_real, z_real,
    )
    return branches


def verify_or(c1, c2, mpk, candidates: Sequence[int],
              branches: Sequence[ORBranch], t: Transcript) -> bool:
    n = len(candidates)
    if len(branches) != n:
        return False

    # 1. Per-branch DLEQ equations.
    for i, br in enumerate(branches):
        lhs1 = point_multiply(G2, br.z)
        rhs1 = br.a1 + point_multiply(c1, br.e)
        if not point_eq(lhs1, rhs1):
            return False
        Di = c2 + point_multiply(G2, (-(candidates[i] % CURVE_ORDER)) % CURVE_ORDER)
        lhs2 = point_multiply(mpk, br.z)
        rhs2 = br.a2 + point_multiply(Di, br.e)
        if not point_eq(lhs2, rhs2):
            return False

    # 2. Aggregate-challenge equality.
    _bind_statement_or(t, c1, c2, mpk, candidates)
    for i, br in enumerate(branches):
        t.append_point(f"or:a1[{i}]", br.a1)
        t.append_point(f"or:a2[{i}]", br.a2)
    e_prime = t.challenge("or:e")
    return sum(br.e for br in branches) % CURVE_ORDER == e_prime


# ---------------------------------------------------------------------------
#  Budget proofs (exact only — variant-A scope per decisions)
#
#  Exact: prove cΣ encrypts B (DLEQ on the canonical instance).
#  ``budget:mode`` byte and ``budget:B`` scalar are bound first.
# ---------------------------------------------------------------------------

def _bind_budget(t: Transcript, B: int, mode: str) -> None:
    if mode not in ("exact", "atMost"):
        raise ValueError(f"unknown budget mode: {mode}")
    t.append("budget:mode", b"\x00" if mode == "exact" else b"\x01")
    t.append_scalar("budget:B", B % CURVE_ORDER)


def _budget_dleq_instance(c1_sum, c2_sum, mpk, B: int):
    D = c2_sum + point_multiply(G2, (-(B % CURVE_ORDER)) % CURVE_ORDER)
    return G2, c1_sum, mpk, D       # base1, point1, base2, point2


def prove_budget_exact(c1_sum, c2_sum, mpk, B: int, r_sum: int, t: Transcript,
                       *, w: int | None = None) -> tuple[int, int]:
    _bind_budget(t, B, "exact")
    base1, point1, base2, point2 = _budget_dleq_instance(c1_sum, c2_sum, mpk, B)
    return prove_dleq_g2(base1, point1, base2, point2, r_sum, t, w=w)


def verify_budget_exact(c1_sum, c2_sum, mpk, B: int, e: int, z: int, t: Transcript) -> bool:
    _bind_budget(t, B, "exact")
    base1, point1, base2, point2 = _budget_dleq_instance(c1_sum, c2_sum, mpk, B)
    return verify_dleq_g2(base1, point1, base2, point2, e, z, t)


# ---------------------------------------------------------------------------
#  Ballot-validity-proof binary codec (variant A only)
#
#  Wire layout (mirrors src/contract/codec.ts):
#      [0]      version       u8  (0x01)
#      [1]      variant       u8  (0x41='A')
#      [2..3]   n_outer       u16BE     (= numCandidates for variant A)
#      [4..]    branch_count  u16BE per outer i (= B+1 for variant A)
#      [...]    or_proofs     n_outer × branch_count × 256 bytes
#                              each branch = a1(96) ‖ a2(96) ‖ e(32) ‖ z(32)
#      [...]    budget_tag    u8   (0x00 = exact)
#      [...]    budget        exact: 64 bytes DLEQ (e ‖ z)
# ---------------------------------------------------------------------------

BVP_VERSION = 0x01
_VARIANT_A_BYTE = 0x41
_BUDGET_EXACT = 0x00
_BRANCH_SIZE = 2 * 96 + 2 * 32   # 256


def encode_ballot_validity_proof(
    range_proofs: Sequence[Sequence[ORBranch]],
    budget_proof_e: int,
    budget_proof_z: int,
) -> bytes:
    """Variant-A / exact-mode encoder. Matches the SDK byte-for-byte."""
    n_outer = len(range_proofs)
    if n_outer == 0:
        raise ValueError("encode_ballot_validity_proof: no range proofs")
    branch_count = len(range_proofs[0])
    if any(len(p) != branch_count for p in range_proofs):
        raise ValueError("encode_ballot_validity_proof: branch counts diverge")

    out = bytearray()
    out.append(BVP_VERSION)
    out.append(_VARIANT_A_BYTE)
    out += n_outer.to_bytes(2, "big")
    for _ in range(n_outer):
        out += branch_count.to_bytes(2, "big")
    for proof in range_proofs:
        for br in proof:
            out += g2_to_compressed(br.a1)
            out += g2_to_compressed(br.a2)
            out += (br.e % CURVE_ORDER).to_bytes(32, "big")
            out += (br.z % CURVE_ORDER).to_bytes(32, "big")
    out.append(_BUDGET_EXACT)
    out += (budget_proof_e % CURVE_ORDER).to_bytes(32, "big")
    out += (budget_proof_z % CURVE_ORDER).to_bytes(32, "big")
    return bytes(out)


def decode_ballot_validity_proof(
    buf: bytes, num_candidates: int, budget: int,
) -> tuple[list[list[ORBranch]], int, int]:
    """Decode variant-A / exact bytes. Returns (range_proofs, e, z)."""
    if len(buf) < 4:
        raise ValueError("decode_ballot_validity_proof: buffer too short")
    o = 0
    if buf[o] != BVP_VERSION:
        raise ValueError(f"unsupported version 0x{buf[o]:02x}")
    o += 1
    if buf[o] != _VARIANT_A_BYTE:
        raise ValueError(f"only variant A is supported on this port (got 0x{buf[o]:02x})")
    o += 1
    n_outer = int.from_bytes(buf[o:o + 2], "big"); o += 2
    if n_outer != num_candidates:
        raise ValueError(f"n_outer wire {n_outer} != numCandidates {num_candidates}")
    branch_count_expected = budget + 1
    branch_counts = []
    for _ in range(n_outer):
        bc = int.from_bytes(buf[o:o + 2], "big"); o += 2
        if bc != branch_count_expected:
            raise ValueError(f"branch_count {bc} != expected {branch_count_expected}")
        branch_counts.append(bc)

    range_proofs = []
    for bc in branch_counts:
        branches = []
        for _ in range(bc):
            a1 = g2_from_compressed(buf[o:o + 96]); o += 96
            a2 = g2_from_compressed(buf[o:o + 96]); o += 96
            e = int.from_bytes(buf[o:o + 32], "big"); o += 32
            z = int.from_bytes(buf[o:o + 32], "big"); o += 32
            branches.append(ORBranch(a1, a2, e, z))
        range_proofs.append(branches)

    if o >= len(buf):
        raise ValueError("decode_ballot_validity_proof: truncated before budget tag")
    tag = buf[o]; o += 1
    if tag != _BUDGET_EXACT:
        raise ValueError(f"only exact-budget is supported on this port (got 0x{tag:02x})")
    e = int.from_bytes(buf[o:o + 32], "big"); o += 32
    z = int.from_bytes(buf[o:o + 32], "big"); o += 32
    if o != len(buf):
        raise ValueError(f"{len(buf) - o} trailing bytes after parse")
    return range_proofs, e, z


# ---------------------------------------------------------------------------
#  Canonical preimage + ballot transcript seeding + buildBallot/verifyBallot
# ---------------------------------------------------------------------------

BALLOT_LABEL = "SHUTTER-VOTE-BALLOT-v1"


def canonical_ballot_message(
    election_id: bytes,
    pseudonym: bytes,
    ciphertexts: Sequence[tuple[bytes, bytes]],
    zk_proof: bytes,
) -> bytes:
    """Mirrors ``verify.ts:canonicalBallotMessage``."""
    if len(election_id) != 32:
        raise ValueError(f"electionId must be 32 bytes (got {len(election_id)})")
    if len(pseudonym) != 32:
        raise ValueError(f"pseudonym must be 32 bytes (got {len(pseudonym)})")
    for c1, c2 in ciphertexts:
        if len(c1) != 96 or len(c2) != 96:
            raise ValueError("each ciphertext component must be 96 bytes")
    out = bytearray()
    out += BALLOT_LABEL.encode("utf-8")
    out += election_id
    out += pseudonym
    n = len(ciphertexts)
    out += n.to_bytes(2, "big")
    for c1, c2 in ciphertexts:
        out += c1
        out += c2
    out += len(zk_proof).to_bytes(4, "big")
    out += zk_proof
    return bytes(out)


def seed_ballot_transcript(
    election_id: bytes,
    mpk,
    vk,
    ciphertexts_pts: Sequence[tuple],
    *,
    num_candidates: int,
    budget: int,
    mode: str = "exact",
    variant: str = "A",
) -> Transcript:
    """Mirrors ``verify.ts:seedBallotTranscript``. Variant-A / exact only."""
    if mode != "exact" or variant != "A":
        raise NotImplementedError("Only Variant A / exact mode is ported (decision C scope)")
    t = Transcript(BALLOT_LABEL)
    t.append("electionId", election_id)
    t.append_point("mpk", mpk)
    # vk is a G1Point; the SDK appends its compressed bytes.
    t.append("vk", g1_to_compressed(vk))
    t.append("variant", b"\x41")
    t.append("mode", b"\x00")
    t.append("numCandidates", num_candidates.to_bytes(2, "big"))
    t.append("budget", budget.to_bytes(2, "big"))
    t.append("|cts|", len(ciphertexts_pts).to_bytes(2, "big"))
    for i, (c1, c2) in enumerate(ciphertexts_pts):
        t.append_point(f"ct.c1[{i}]", c1)
        t.append_point(f"ct.c2[{i}]", c2)
    return t


# ---------------------------------------------------------------------------
#  buildBallot / verifyBallot wrappers (Variant A / exact)
# ---------------------------------------------------------------------------

@dataclass
class BuildBallotResult:
    election_id: bytes
    pseudonym: bytes
    vk: bytes                             # 48-byte compressed G1
    ciphertexts: list[tuple[bytes, bytes]]  # each (96, 96)
    zk_proof: bytes
    voter_signature: bytes                # 80 bytes
    canonical_preimage: bytes             # for debugging / interop


def build_ballot(
    *,
    mpk,
    election_id: bytes,
    pseudonym: bytes,
    sk: int,
    vk,
    votes: Sequence[int],
    num_candidates: int,
    budget: int,
    # Optional pinned randomness for fixture reproducibility.
    rs: Sequence[int] | None = None,
    range_proof_w: Sequence[int] | None = None,
    range_proof_sims: Sequence[Sequence[tuple[int, int] | None]] | None = None,
    budget_proof_w: int | None = None,
    schnorr_k: int | None = None,
) -> BuildBallotResult:
    """Variant-A / exact-mode buildBallot. Mirrors ``highlevel.ts:buildBallot``."""
    if len(votes) != num_candidates:
        raise ValueError(f"votes length {len(votes)} != numCandidates {num_candidates}")
    for j, v in enumerate(votes):
        if v < 0 or v > budget:
            raise ValueError(f"vote[{j}] = {v} not in [0, {budget}]")

    # Aggregate-vote bound. This port is exact-mode only; without this check a
    # vote vector violating Σvotes == B would encrypt fine and the budget proof
    # would fail at the verifier — caller never learns the input was wrong.
    vote_sum = sum(int(v) for v in votes)
    if vote_sum != budget:
        raise ValueError(
            f"build_ballot: exact mode requires Σvotes == {budget}, got {vote_sum}"
        )

    # Keypair sanity: vk must equal sk · P1. Catches mismatched-keypair bugs at
    # construction instead of producing a ballot whose Schnorr signature fails.
    if _g1_mul(sk) != vk:
        raise ValueError("build_ballot: vk does not match sk · P1 (mismatched keypair)")

    # 1. Encrypt.
    ciphertexts_pts: list[tuple] = []
    rs_used: list[int] = []
    for j, v in enumerate(votes):
        r = (rs[j] if rs is not None else random_scalar()) % CURVE_ORDER
        c1 = point_multiply(G2, r)
        c2 = point_multiply(mpk, r) + point_multiply(G2, v)
        ciphertexts_pts.append((c1, c2))
        rs_used.append(r)

    # 2. Seed transcript.
    t = seed_ballot_transcript(
        election_id, mpk, vk, ciphertexts_pts,
        num_candidates=num_candidates, budget=budget,
    )

    # 3. Range OR per candidate.
    candidates = list(range(budget + 1))
    range_proofs: list[list[ORBranch]] = []
    for j in range(num_candidates):
        t.append("ballot:range", j.to_bytes(2, "big"))
        c1, c2 = ciphertexts_pts[j]
        proof = prove_or(
            c1, c2, mpk, candidates, rs_used[j], int(votes[j]), t,
            w=(range_proof_w[j] if range_proof_w is not None else None),
            simulated=(range_proof_sims[j] if range_proof_sims is not None else None),
        )
        range_proofs.append(proof)

    # 4. Aggregate + budget proof (exact).
    c1_sum = Z2
    c2_sum = Z2
    for c1, c2 in ciphertexts_pts:
        c1_sum = c1_sum + c1
        c2_sum = c2_sum + c2
    r_sum = sum(rs_used) % CURVE_ORDER
    t.append("ballot:budget", b"\x00")
    e_b, z_b = prove_budget_exact(c1_sum, c2_sum, mpk, budget, r_sum, t, w=budget_proof_w)

    # 5. Encode proof + canonical preimage + Schnorr.
    zk_proof = encode_ballot_validity_proof(range_proofs, e_b, z_b)
    ciphertext_bytes = [(g2_to_compressed(c1), g2_to_compressed(c2)) for (c1, c2) in ciphertexts_pts]
    preimage = canonical_ballot_message(election_id, pseudonym, ciphertext_bytes, zk_proof)
    msg = keccak(preimage)
    R, s = schnorr_sign(sk, vk, msg, k=schnorr_k)
    sig_bytes = encode_schnorr(R, s)

    return BuildBallotResult(
        election_id=election_id,
        pseudonym=pseudonym,
        vk=g1_to_compressed(vk),
        ciphertexts=ciphertext_bytes,
        zk_proof=zk_proof,
        voter_signature=sig_bytes,
        canonical_preimage=preimage,
    )


# Caller-supplied WR attestation verifier signature.
WRAttestationVerifier = Callable[[bytes, bytes, bytes, bytes], bool]


# ---------------------------------------------------------------------------
#  WR attestation (dev — Schnorr on G1; algorithm choice is dev-only)
#
#  The German concept doc §3.3 specifies the signed bytes verbatim as the
#  three-part concatenation ``ElectionID ∥ Pseudonym ∥ PK_voter`` — no
#  domain separator. The doc explicitly defers the signature *algorithm*
#  to a lower-level spec (§1.1: "ohne kryptographische Konstruktionen").
#  We pick Schnorr-on-G1 + keccak256 as the dev choice; see TODO.md.
# ---------------------------------------------------------------------------

def make_wr_attestation_verifier(wr_pk_bytes: bytes) -> WRAttestationVerifier:
    """Build a verifier matching the WR scheme implemented by ``wr_oracle.py``.

    ``wr_pk_bytes`` is the 48-byte compressed G1 of the WR vk — typically
    sourced from ``Election.getElection().config.pkWR``.
    """
    wr_vk = g1_from_compressed(wr_pk_bytes)

    def verify(election_id: bytes, pseudonym: bytes, vk_bytes: bytes,
               attestation: bytes) -> bool:
        if len(election_id) != 32 or len(pseudonym) != 32 or len(vk_bytes) != 48:
            return False
        try:
            R, s = decode_schnorr(attestation)
        except Exception:
            return False
        # Concept doc §3.3: signed bytes = electionId ∥ pseudonym ∥ vk
        msg = keccak(election_id + pseudonym + vk_bytes)
        return schnorr_verify(wr_vk, msg, R, s)

    return verify


def verify_ballot(
    *,
    mpk,
    election_id: bytes,
    pseudonym: bytes,
    vk_bytes: bytes,
    ciphertext_bytes: Sequence[tuple[bytes, bytes]],
    zk_proof: bytes,
    voter_signature: bytes,
    wr_attestation: bytes,
    num_candidates: int,
    budget: int,
    verify_wr: WRAttestationVerifier,
) -> tuple[bool, str | None]:
    """Variant-A / exact-mode verifyBallot. Returns ``(ok, reason)``."""
    if num_candidates < 1 or num_candidates > 0xFFFF:
        return False, f"numCandidates ({num_candidates}) out of range"
    if budget < 1 or budget > 0xFFFF:
        return False, f"budget ({budget}) out of range"
    if len(election_id) != 32:
        return False, f"electionId must be 32 bytes"
    if len(pseudonym) != 32:
        return False, f"pseudonym must be 32 bytes"

    if mpk == Z2:
        return False, "mpk is identity (would collapse ciphertext privacy)"

    try:
        vk = g1_from_compressed(vk_bytes)
    except Exception as e:
        return False, f"vk decode: {e}"
    if vk == Z1:
        return False, "vk is identity"

    if len(ciphertext_bytes) != num_candidates:
        return False, f"ciphertexts.length {len(ciphertext_bytes)} != numCandidates {num_candidates}"

    cts_pts = []
    for i, (c1b, c2b) in enumerate(ciphertext_bytes):
        try:
            cts_pts.append((g2_from_compressed(c1b), g2_from_compressed(c2b)))
        except Exception as e:
            return False, f"ciphertext[{i}] decode: {e}"

    if not verify_wr(election_id, pseudonym, vk_bytes, wr_attestation):
        return False, "wrAttestation verification failed"

    try:
        range_proofs, e_b, z_b = decode_ballot_validity_proof(zk_proof, num_candidates, budget)
    except Exception as e:
        return False, f"zkProof decode: {e}"

    t = seed_ballot_transcript(
        election_id, mpk, vk, cts_pts,
        num_candidates=num_candidates, budget=budget,
    )
    candidates = list(range(budget + 1))
    for j in range(num_candidates):
        t.append("ballot:range", j.to_bytes(2, "big"))
        c1, c2 = cts_pts[j]
        if not verify_or(c1, c2, mpk, candidates, range_proofs[j], t):
            return False, f"range proof {j} failed"

    c1_sum = Z2
    c2_sum = Z2
    for c1, c2 in cts_pts:
        c1_sum = c1_sum + c1
        c2_sum = c2_sum + c2
    t.append("ballot:budget", b"\x00")
    if not verify_budget_exact(c1_sum, c2_sum, mpk, budget, e_b, z_b, t):
        return False, "budget proof failed"

    try:
        R, s = decode_schnorr(voter_signature)
    except Exception as e:
        return False, f"signature decode: {e}"
    preimage = canonical_ballot_message(election_id, pseudonym, ciphertext_bytes, zk_proof)
    msg = keccak(preimage)
    if not schnorr_verify(vk, msg, R, s):
        return False, "signature invalid"

    return True, None


__all__ = [
    "BALLOT_LABEL",
    "BVP_VERSION",
    "BuildBallotResult",
    "DLEQ_BYTES",
    "DST_SCHNORR",
    "ONCHAIN_DECRYPT_LABEL",
    "ORBranch",
    "SCHNORR_BYTES",
    "Transcript",
    "WRAttestationVerifier",
    "build_ballot",
    "canonical_ballot_message",
    "decode_ballot_validity_proof",
    "decode_dleq",
    "decode_schnorr",
    "election_id_to_bytes32",
    "encode_ballot_validity_proof",
    "encode_dleq",
    "encode_schnorr",
    "hash_to_scalar",
    "make_decryption_share",
    "make_wr_attestation_verifier",
    "make_onchain_decrypt_transcript",
    "prove_budget_exact",
    "prove_decryption_share",
    "prove_dleq_g2",
    "prove_or",
    "schnorr_keygen",
    "schnorr_sign",
    "schnorr_verify",
    "seed_ballot_transcript",
    "verify_ballot",
    "verify_budget_exact",
    "verify_decryption_share",
    "verify_dleq_g2",
    "verify_or",
]
