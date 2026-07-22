"""
Non-interactive Zero-Knowledge Proofs for the threshold ElGamal voting system
over BLS12-381 G2.

Implements three proof types (all Fiat-Shamir transformed):

1. Range Proof (Vote Validity):
   Proves a ciphertext encrypts a value in {0, 1, ..., B} using a
   (B+1)-branch OR-composition of DLEQ proofs.
   Spec §6.1.1: For each possible value mᵢ, define Dᵢ = C₂ - mᵢ·P₂.
   Real branch: a₁ = w·P₂, a₂ = w·mpk.
   Simulated: a₁ = zᵢ·P₂ - eᵢ·C₁, a₂ = zᵢ·mpk - eᵢ·Dᵢ.

2. Budget Proof (Exact Budget):
   Proves the sum of encrypted votes equals exactly B using a DLEQ proof
   on the homomorphically aggregated ciphertext.
   Spec §6.1.3: D = (c_Σ)₂ - B·P₂ = r_Σ·mpk. Prove log_{P₂}(c_Σ₁) = log_{mpk}(D).

3. Decryption Share Proof:
   Proves a partial decryption share σₖ = mskₖ·C₁ is correctly formed.
   Spec §6.3: Prove log_{P₂}(mpkₖ) = log_{C₁}(σₖ).
"""

from .primitives import (
    G2, Z2, CURVE_ORDER,
    point_multiply, point_add, point_neg, point_eq,
    hash_to_scalar, random_scalar,
)

# Domain separation tags for Fiat-Shamir hashes
_DOMAIN_RANGE = b"THRESHOLD_ELGAMAL_RANGE_PROOF_V1"
_DOMAIN_BUDGET = b"THRESHOLD_ELGAMAL_BUDGET_PROOF_V1"
_DOMAIN_DECRYPT = b"THRESHOLD_ELGAMAL_DECRYPT_PROOF_V1"


# ---------------------------------------------------------------------------
#  1. Range Proof: v ∈ {0, 1, ..., B}   (Spec §6.1.1)
# ---------------------------------------------------------------------------

def prove_range(mpk, C1, C2, m, r, B, election_id=""):
    """Prove that ciphertext (C1, C2) encrypts m ∈ {0, 1, ..., B}.

    Uses a (B+1)-branch OR-composition of DLEQ proofs.
    For each possible value i, define Dᵢ = C₂ - i·P₂.
    If m == i (real branch): the prover knows r such that C₁ = r·P₂ and Dᵢ = r·mpk.
    If m != i (simulated branch): the prover simulates a DLEQ proof.

    Args:
        mpk: election public key (G2 point)
        C1, C2: ciphertext components (G2 points)
        m: actual encrypted value (0 <= m <= B)
        r: encryption randomness (scalar)
        B: upper bound of allowed range
        election_id: optional election identifier bound into the proof

    Returns:
        List of (eᵢ, zᵢ) tuples for i = 0..B.
    """
    if not (0 <= m <= B):
        raise ValueError(f"Message {m} not in range [0, {B}]")

    # Dᵢ = C₂ - i·P₂ for each possible value i
    D = [point_add(C2, point_neg(point_multiply(G2, i))) for i in range(B + 1)]

    # Generate commitments for each branch
    a_values = [None] * (B + 1)  # (a₁ᵢ, a₂ᵢ) G2 points
    challenges = [None] * (B + 1)
    responses = [None] * (B + 1)

    # Real branch: random commitment
    w = random_scalar()
    a_values[m] = (point_multiply(G2, w), point_multiply(mpk, w))

    # Simulated branches: random challenge and response, derive commitments
    for i in range(B + 1):
        if i == m:
            continue
        e_i = random_scalar()
        z_i = random_scalar()
        # a₁ᵢ = zᵢ·P₂ - eᵢ·C₁
        a1 = point_add(point_multiply(G2, z_i), point_neg(point_multiply(C1, e_i)))
        # a₂ᵢ = zᵢ·mpk - eᵢ·Dᵢ
        a2 = point_add(point_multiply(mpk, z_i), point_neg(point_multiply(D[i], e_i)))
        a_values[i] = (a1, a2)
        challenges[i] = e_i
        responses[i] = z_i

    # Fiat-Shamir challenge: H(P₂, mpk, C₁, C₂, {a₁ᵢ, a₂ᵢ}, election_id)
    hash_args = [G2, mpk, C1, C2]
    for a1, a2 in a_values:
        hash_args.extend([a1, a2])
    if election_id:
        hash_args.append(election_id)
    e = hash_to_scalar(*hash_args, domain=_DOMAIN_RANGE)

    # Real branch: compute challenge and response
    e_sum_sim = sum(c for c in challenges if c is not None) % CURVE_ORDER
    e_real = (e - e_sum_sim) % CURVE_ORDER
    z_real = (w + r * e_real) % CURVE_ORDER
    challenges[m] = e_real
    responses[m] = z_real

    return list(zip(challenges, responses))


def verify_range(mpk, C1, C2, proof, B, election_id=""):
    """Verify a range proof that (C1, C2) encrypts a value in {0, ..., B}.

    Spec §6.1.2: For each branch i, recompute commitments and check
    that Σeᵢ ≡ e' (mod q).

    Returns True if the proof is valid.
    """
    if len(proof) != B + 1:
        return False

    D = [point_add(C2, point_neg(point_multiply(G2, i))) for i in range(B + 1)]

    a_values = []
    e_sum = 0
    for i in range(B + 1):
        e_i, z_i = proof[i]
        # a₁ᵢ = zᵢ·P₂ - eᵢ·C₁
        a1 = point_add(point_multiply(G2, z_i), point_neg(point_multiply(C1, e_i)))
        # a₂ᵢ = zᵢ·mpk - eᵢ·Dᵢ
        a2 = point_add(point_multiply(mpk, z_i), point_neg(point_multiply(D[i], e_i)))
        a_values.append((a1, a2))
        e_sum = (e_sum + e_i) % CURVE_ORDER

    hash_args = [G2, mpk, C1, C2]
    for a1, a2 in a_values:
        hash_args.extend([a1, a2])
    if election_id:
        hash_args.append(election_id)
    e_expected = hash_to_scalar(*hash_args, domain=_DOMAIN_RANGE)

    return e_sum == e_expected


# ---------------------------------------------------------------------------
#  2. Budget Proof: Σvⱼ = B exactly   (Spec §6.1.3)
# ---------------------------------------------------------------------------

def prove_exact_budget(mpk, sum_C1, sum_C2, B, r_sum, election_id=""):
    """Prove that the aggregated ciphertext encrypts exactly B.

    This is a DLEQ proof showing log_{P₂}(sum_C1) = log_{mpk}(D) = r_sum,
    where D = sum_C2 - B·P₂. If the sum of votes equals B, then D = r_sum·mpk.

    Args:
        mpk: election public key (G2 point)
        sum_C1, sum_C2: homomorphically aggregated ciphertext (G2 points)
        B: exact budget value
        r_sum: sum of all encryption randomness values (scalar)
        election_id: optional election identifier bound into the proof

    Returns:
        Tuple (e, z) constituting the DLEQ proof.
    """
    # D = sum_C2 - B·P₂
    D = point_add(sum_C2, point_neg(point_multiply(G2, B)))

    w = random_scalar()
    a1 = point_multiply(G2, w)   # w · P₂
    a2 = point_multiply(mpk, w)  # w · mpk

    hash_args = [G2, mpk, sum_C1, D, a1, a2]
    if election_id:
        hash_args.append(election_id)
    e = hash_to_scalar(*hash_args, domain=_DOMAIN_BUDGET)
    z = (w + r_sum * e) % CURVE_ORDER

    return (e, z)


def verify_exact_budget(mpk, sum_C1, sum_C2, B, proof, election_id=""):
    """Verify an exact budget proof.

    Recomputes the DLEQ commitments and checks the Fiat-Shamir hash.
    Returns True if the proof is valid.
    """
    e, z = proof
    D = point_add(sum_C2, point_neg(point_multiply(G2, B)))

    # a₁ = z·P₂ - e·sum_C1
    a1 = point_add(point_multiply(G2, z), point_neg(point_multiply(sum_C1, e)))
    # a₂ = z·mpk - e·D
    a2 = point_add(point_multiply(mpk, z), point_neg(point_multiply(D, e)))

    hash_args = [G2, mpk, sum_C1, D, a1, a2]
    if election_id:
        hash_args.append(election_id)
    e_check = hash_to_scalar(*hash_args, domain=_DOMAIN_BUDGET)
    return e == e_check


# ---------------------------------------------------------------------------
#  3. Decryption Share Proof: log_{P₂}(mpkₖ) = log_{C₁}(σₖ)   (Spec §6.3)
# ---------------------------------------------------------------------------

def prove_decryption_share(C1, msk_k, mpk_k, sigma_k):
    """Prove correct partial decryption: σₖ = mskₖ · C₁.

    This is a DLEQ proof showing that the same secret key mskₖ was used
    to form both mpkₖ = mskₖ·P₂ and σₖ = mskₖ·C₁.

    Spec §6.3:
      a₁ = w·P₂, a₂ = w·C₁
      e = H(mpkₖ, σₖ, a₁, a₂)
      z = w + mskₖ·e mod q

    Returns:
        Tuple (e, z) constituting the DLEQ proof.
    """
    w = random_scalar()
    a1 = point_multiply(G2, w)   # w · P₂
    a2 = point_multiply(C1, w)   # w · C₁

    e = hash_to_scalar(mpk_k, sigma_k, a1, a2, domain=_DOMAIN_DECRYPT)
    z = (w + msk_k * e) % CURVE_ORDER

    return (e, z)


def verify_decryption_share(C1, mpk_k, sigma_k, proof):
    """Verify a decryption share proof.

    Spec §6.3 verification:
      a₁' = z·P₂ - e·mpkₖ
      a₂' = z·C₁ - e·σₖ
      e' = H(mpkₖ, σₖ, a₁', a₂')
      Accept iff e' == e.

    Returns True if the proof is valid.
    """
    e, z = proof

    # a₁' = z·P₂ - e·mpkₖ
    a1 = point_add(point_multiply(G2, z), point_neg(point_multiply(mpk_k, e)))
    # a₂' = z·C₁ - e·σₖ
    a2 = point_add(point_multiply(C1, z), point_neg(point_multiply(sigma_k, e)))

    e_check = hash_to_scalar(mpk_k, sigma_k, a1, a2, domain=_DOMAIN_DECRYPT)
    return e == e_check
