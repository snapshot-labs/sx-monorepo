"""
Linear homomorphic ElGamal encryption in the exponent over BLS12-381 G2.

Encrypt(m) = (r·P₂, r·mpk + m·P₂) where r is random.
Homomorphic: Enc(m₁) + Enc(m₂) = Enc(m₁ + m₂) (point-wise addition).
Decryption requires solving DLog for small m (baby-step-giant-step on EC).
"""

import math
from .primitives import (
    G2, Z2, CURVE_ORDER,
    point_multiply, point_add, point_neg, point_eq, is_identity,
    random_scalar,
)


def encrypt(mpk, m):
    """ElGamal encryption in the exponent over G2.

    Args:
        mpk: election public key (G2 point)
        m: message (integer, must be small for decryption)

    Returns (C1, C2, r) where:
        C1 = r · P₂           (G2 point)
        C2 = r · mpk + m · P₂ (G2 point)
        r  = encryption randomness (scalar, needed for ZK proofs)
    """
    r = random_scalar()
    C1 = point_multiply(G2, r)
    C2 = point_add(point_multiply(mpk, r), point_multiply(G2, m))
    return C1, C2, r


def homomorphic_add(ct_a, ct_b):
    """Homomorphically add two ciphertexts (point-wise EC addition)."""
    return (point_add(ct_a[0], ct_b[0]), point_add(ct_a[1], ct_b[1]))


def aggregate_ciphertexts(ciphertexts):
    """Aggregate a list of ciphertexts homomorphically."""
    result = (Z2, Z2)  # identity: encrypts 0 with r=0
    for ct in ciphertexts:
        result = homomorphic_add(result, ct)
    return result


def baby_step_giant_step(target, max_val):
    """Find m in [0, max_val] such that m·P₂ = target (G2 point).

    Uses baby-step-giant-step algorithm: O(sqrt(max_val)) time and space.
    Returns m or None if not found.
    """
    if max_val == 0:
        return 0 if is_identity(target) else None

    if is_identity(target):
        return 0

    n = int(math.isqrt(max_val)) + 2

    def _point_key(P):
        """Create a hashable key from a G2 point using compressed bytes."""
        if is_identity(P):
            return b"\x00"
        return P.to_compressed_bytes()

    # Baby steps: table[key(j·P₂)] = j for j = 0, ..., n-1
    table = {}
    power = Z2
    for j in range(n):
        table[_point_key(power)] = j
        power = point_add(power, G2)

    # Giant steps: check target - i*n*P₂ for i = 0, 1, ...
    neg_step = point_neg(point_multiply(G2, n))
    gamma = target
    for i in range(n + 1):
        key = _point_key(gamma)
        if key in table:
            m = i * n + table[key]
            if m <= max_val:
                return m
        gamma = point_add(gamma, neg_step)

    return None


def lagrange_coefficient(j_id, all_ids, q):
    """Compute Lagrange coefficient λ_j for index j_id at x=0.

    λ_j = Π_{k≠j} (0 - k) / (j - k)  mod q
    """
    lam_num = 1
    lam_den = 1
    for k_id in all_ids:
        if k_id == j_id:
            continue
        lam_num = (lam_num * (0 - k_id)) % q
        lam_den = (lam_den * (j_id - k_id)) % q
    return (lam_num * pow(lam_den, -1, q)) % q


def combine_decryption_shares(shares):
    """Combine partial decryption shares via Lagrange interpolation on EC.

    shares: list of (keyper_id, sigma_i) where sigma_i = msk_i · C₁ (G2 point)
    Returns combined sigma = msk · C₁ (G2 point)
    """
    all_ids = [kid for kid, _ in shares]
    result = Z2
    for j_id, sigma_j in shares:
        lam = lagrange_coefficient(j_id, all_ids, CURVE_ORDER)
        result = point_add(result, point_multiply(sigma_j, lam))
    return result


def threshold_decrypt(C1, C2, shares, max_val):
    """Full threshold decryption.

    C1, C2: ciphertext components (G2 points)
    shares: list of (keyper_id, sigma_i) decryption shares (G2 points)
    max_val: upper bound on plaintext for BSGS
    Returns plaintext m or None if decryption fails.
    """
    sigma = combine_decryption_shares(shares)
    tau = point_add(C2, point_neg(sigma))  # tau = m · P₂
    return baby_step_giant_step(tau, max_val)
