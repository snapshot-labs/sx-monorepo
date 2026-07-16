"""
BLS12-381 G2 group primitives and hash utilities for threshold ElGamal.

All encryption operates in G2 of BLS12-381 (Type-3 pairing curve).
DDH is hard in G2 under the SXDH assumption.

Uses py_arkworks_bls12381 (Rust/native) for fast EC operations.
"""

import hashlib
import secrets

from py_arkworks_bls12381 import G1Point, G2Point, Scalar

# BLS12-381 curve order (scalar field order)
CURVE_ORDER = 52435875175126190479447740508185965837690552500527637822603658699938581184513

# Field modulus (for reference / serialization bounds)
FIELD_MODULUS = 4002409555221667393417789825735904156556882819939007885332058136124031650490837864442687629129015664037894272559787

# Generator of G2
G2 = G2Point()

# Identity element in G2
Z2 = G2Point.identity()

# Generator and identity of G1 (used for the Schnorr vk on the voter ballot)
G1 = G1Point()
Z1 = G1Point.identity()

# Canonical BLS12-381 compressed point sizes (zcash format).
# The on-chain ``Election`` requires these exact lengths in
# ``_requireG2Point`` / vk validation, and the SDK uses the same format.
G1_COMPRESSED_BYTES = 48
G2_COMPRESSED_BYTES = 96


def _int_to_scalar(n):
    """Convert a Python int to an arkworks Scalar (mod CURVE_ORDER)."""
    n = n % CURVE_ORDER
    return Scalar(n)


def hash_to_scalar(*args, domain=b""):
    """Fiat-Shamir hash to scalar in Z_q with domain separation.

    Each argument is converted to bytes and preceded by its 4-byte length,
    preventing ambiguous concatenation (e.g. H(1,23) != H(12,3)).
    An optional *domain* tag isolates different proof types.

    Accepts: int, bytes, str, and G2 points (G2Point objects).
    Returns an integer in [0, CURVE_ORDER).
    """
    h = hashlib.sha256()
    # Domain separation tag (length-prefixed)
    h.update(len(domain).to_bytes(4, "big"))
    h.update(domain)
    for a in args:
        if isinstance(a, int):
            b = a.to_bytes((a.bit_length() + 8) // 8, "big", signed=True)
        elif isinstance(a, bytes):
            b = a
        elif isinstance(a, G2Point):
            b = point_to_bytes(a)
        else:
            b = str(a).encode()
        h.update(len(b).to_bytes(4, "big"))
        h.update(b)
    return int.from_bytes(h.digest(), "big") % CURVE_ORDER


# ------------------------------------------------------------------
#  Point arithmetic helpers (thin wrappers for clarity)
# ------------------------------------------------------------------

def point_multiply(P, scalar):
    """Scalar multiplication: scalar * P in G2."""
    return P * _int_to_scalar(scalar)


def point_add(P, Q):
    """Point addition: P + Q in G2."""
    return P + Q


def point_neg(P):
    """Point negation: -P in G2."""
    return -P


def point_eq(P, Q):
    """Point equality check in G2."""
    return P == Q


def is_identity(P):
    """Check if P is the identity (point at infinity) in G2."""
    return P == Z2


# ------------------------------------------------------------------
#  Serialization: G2 points <-> bytes / dict (for JSON transport)
# ------------------------------------------------------------------

def point_to_bytes(P):
    """Serialize a G2 point to canonical bytes (uncompressed, 192 bytes for non-identity).

    Identity is serialized as a single zero byte.
    Non-identity points are serialized as 1-byte prefix + 4 × 48-byte FQ2 coefficients.
    """
    if is_identity(P):
        return b"\x00"
    xy = P.to_xy_bytes_be()
    return b"\x01" + xy


def point_to_dict(P):
    """Serialize a G2 point to a JSON-compatible dict.

    Returns {"identity": true} for the identity point, or
    {"x0": hex, "x1": hex, "y0": hex, "y1": hex} for non-identity points.
    """
    if is_identity(P):
        return {"identity": True}
    xy = P.to_xy_bytes_be()
    # Layout: [x.c0(48) | x.c1(48) | y.c0(48) | y.c1(48)]
    x0 = int.from_bytes(xy[0:48], "big")
    x1 = int.from_bytes(xy[48:96], "big")
    y0 = int.from_bytes(xy[96:144], "big")
    y1 = int.from_bytes(xy[144:192], "big")
    return {
        "x0": hex(x0),
        "x1": hex(x1),
        "y0": hex(y0),
        "y1": hex(y1),
    }


def dict_to_point(d):
    """Deserialize a G2 point from a JSON dict.

    Raises ValueError if the point is not on the G2 curve or not in the subgroup.
    """
    if d.get("identity"):
        return G2Point.identity()
    x0 = int(d["x0"], 16)
    x1 = int(d["x1"], 16)
    y0 = int(d["y0"], 16)
    y1 = int(d["y1"], 16)
    # Reconstruct xy bytes: [x.c0(48) | x.c1(48) | y.c0(48) | y.c1(48)]
    xy = (x0.to_bytes(48, "big") + x1.to_bytes(48, "big") +
          y0.to_bytes(48, "big") + y1.to_bytes(48, "big"))
    try:
        P = G2Point.from_xy_bytes_be(xy)  # validates on-curve
    except Exception as e:
        raise ValueError(f"Point is not on the G2 curve: {e}")
    # Subgroup check
    if not P.is_in_subgroup():
        raise ValueError("Point is not in the G2 prime-order subgroup")
    return P


def validate_g2_point(P):
    """Validate that P is a valid non-identity G2 point in the prime-order subgroup.

    Checks: P != identity and P is in the prime-order subgroup.
    Raises ValueError on failure.
    """
    if is_identity(P):
        raise ValueError("Point is the identity element")
    if not P.is_in_subgroup():
        raise ValueError("Point is not in the G2 prime-order subgroup")


def random_scalar():
    """Generate a cryptographically random scalar in [1, CURVE_ORDER - 1]."""
    return secrets.randbelow(CURVE_ORDER - 1) + 1


# ------------------------------------------------------------------
#  Compressed point codecs (BLS12-381 zcash format)
#
#  These are the byte layouts the production contracts and the
#  shutter-voting-sdk use on the wire. G1 = 48 bytes, G2 = 96 bytes.
#  The identity element is encoded with the high bit of the first
#  byte set (0xc0...).
# ------------------------------------------------------------------

def g2_to_compressed(P) -> bytes:
    """Serialize a G2 point to 96-byte compressed form."""
    b = P.to_compressed_bytes()
    if len(b) != G2_COMPRESSED_BYTES:
        raise ValueError(
            f"G2 compressed encoding produced {len(b)} bytes, expected {G2_COMPRESSED_BYTES}"
        )
    return bytes(b)


def g2_from_compressed(b: bytes):
    """Deserialize a 96-byte compressed G2 point with subgroup check.

    Raises ValueError if the bytes are the wrong length, not on-curve, or
    not in the prime-order subgroup.
    """
    if len(b) != G2_COMPRESSED_BYTES:
        raise ValueError(
            f"Expected {G2_COMPRESSED_BYTES}-byte G2 compressed point, got {len(b)}"
        )
    try:
        P = G2Point.from_compressed_bytes(bytes(b))
    except Exception as e:
        raise ValueError(f"Invalid G2 compressed encoding: {e}")
    if not P.is_in_subgroup():
        raise ValueError("G2 point is not in the prime-order subgroup")
    return P


def g1_to_compressed(P) -> bytes:
    """Serialize a G1 point to 48-byte compressed form."""
    b = P.to_compressed_bytes()
    if len(b) != G1_COMPRESSED_BYTES:
        raise ValueError(
            f"G1 compressed encoding produced {len(b)} bytes, expected {G1_COMPRESSED_BYTES}"
        )
    return bytes(b)


def g1_from_compressed(b: bytes):
    """Deserialize a 48-byte compressed G1 point with subgroup check.

    Raises ValueError if the bytes are the wrong length, not on-curve, or
    not in the prime-order subgroup.
    """
    if len(b) != G1_COMPRESSED_BYTES:
        raise ValueError(
            f"Expected {G1_COMPRESSED_BYTES}-byte G1 compressed point, got {len(b)}"
        )
    try:
        P = G1Point.from_compressed_bytes(bytes(b))
    except Exception as e:
        raise ValueError(f"Invalid G1 compressed encoding: {e}")
    if not P.is_in_subgroup():
        raise ValueError("G1 point is not in the prime-order subgroup")
    return P
