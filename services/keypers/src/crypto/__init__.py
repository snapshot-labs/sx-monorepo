"""
Threshold ElGamal cryptographic primitives over BLS12-381.

All operations use the G2 group of the BLS12-381 pairing curve.
DDH hardness in G2 is guaranteed under the SXDH assumption (Type-3 pairing).

Implements:
- BLS12-381 G2 point arithmetic, serialization, and Fiat-Shamir hashing
- ElGamal encryption in the exponent with homomorphic addition
- Distributed Key Generation (Feldman VSS based)
- Zero-knowledge proofs: range proofs, budget proofs, decryption share proofs
"""
