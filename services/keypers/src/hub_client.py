"""
Hub transport — replaces the ``eth_client`` on-chain transport with HTTP
calls to the Snapshot hub.

The hub is the source of truth for permanent private voting:
  - DKG result (mpk + per-keyper committee public keys) is collected at
    ``POST /api/proposal/{proposal_id}/te_dkg`` from each keyper. Once
    threshold-many submissions agree on the same (mpk, committee_pks),
    the hub writes them to the proposal row.
  - The tally aggregate is computed by the sequencer's tally worker
    (Phase 4) and exposed at ``GET /api/proposal/{proposal_id}/te_aggregate``.
  - Decryption shares + DLEQ proofs go to ``POST /api/proposal/{proposal_id}/te_decryption_share``.

Auth: every keyper-to-hub message is EIP-191 signed by the keyper's
Ethereum signing key. The hub's allow-list of keyper addresses is
written to the proposal row at proposal-create time (Phase 7 surface).
"""

from __future__ import annotations

import hashlib
from typing import Any

import requests
from eth_account import Account
from eth_account.messages import encode_defunct
from eth_utils import keccak


_DST_TE_DKG = b"SX-TE-DKG-v1"
_DST_TE_DECRYPT = b"SX-TE-DECRYPT-v1"


def _committee_pks_hash(committee_pks_hex: list[str]) -> bytes:
    """Domain-separated hash of the ordered committee_pks list.

    Used in the signed DKG payload so a keyper signs a fixed-size digest
    rather than a variable-length list — keeps the on-wire signature
    payload small and unambiguous.
    """
    parts = [len(committee_pks_hex).to_bytes(4, "big")]
    for pk in committee_pks_hex:
        b = bytes.fromhex(pk.removeprefix("0x"))
        parts.append(len(b).to_bytes(4, "big"))
        parts.append(b)
    return hashlib.sha256(b"".join(parts)).digest()


def _te_dkg_payload_hash(proposal_id: str, mpk_hex: str, committee_pks_hex: list[str]) -> bytes:
    parts = [
        _DST_TE_DKG,
        len(proposal_id).to_bytes(4, "big"),
        proposal_id.encode("utf-8"),
        bytes.fromhex(mpk_hex.removeprefix("0x")),
        _committee_pks_hash(committee_pks_hex),
    ]
    return keccak(b"".join(parts))


def _te_share_payload_hash(
    proposal_id: str,
    candidate: int,
    sigma_hex: str,
    proof_e: int,
    proof_z: int,
) -> bytes:
    parts = [
        _DST_TE_DECRYPT,
        len(proposal_id).to_bytes(4, "big"),
        proposal_id.encode("utf-8"),
        candidate.to_bytes(4, "big"),
        bytes.fromhex(sigma_hex.removeprefix("0x")),
        proof_e.to_bytes(32, "big", signed=False),
        proof_z.to_bytes(32, "big", signed=False),
    ]
    return keccak(b"".join(parts))


def _sign(private_key: str, payload_hash: bytes) -> str:
    acct = Account.from_key(private_key)
    msg = encode_defunct(primitive=payload_hash)
    return "0x" + acct.sign_message(msg).signature.hex().removeprefix("0x")


class HubClientError(RuntimeError):
    pass


class HubClient:
    """Thin HTTP client over the hub's te_* endpoints."""

    def __init__(self, hub_url: str, private_key: str, *, timeout: float = 30.0):
        self.hub_url = hub_url.rstrip("/")
        self.private_key = private_key
        self.address = Account.from_key(private_key).address
        self.timeout = timeout

    def submit_dkg_result(
        self,
        proposal_id: str,
        keyper_index: int,
        mpk_hex: str,
        committee_pks_hex: list[str],
    ) -> dict[str, Any]:
        """POST the keyper's view of the DKG result to the hub.

        The hub aggregates submissions and finalises (mpk, committee_pks)
        on the proposal row once at least t+1 keypers report identical
        values.
        """
        payload_hash = _te_dkg_payload_hash(proposal_id, mpk_hex, committee_pks_hex)
        signature = _sign(self.private_key, payload_hash)
        body = {
            "keyper_index": keyper_index,
            "keyper_address": self.address,
            "mpk": mpk_hex if mpk_hex.startswith("0x") else "0x" + mpk_hex,
            "committee_pks": [
                pk if pk.startswith("0x") else "0x" + pk for pk in committee_pks_hex
            ],
            "signature": signature,
        }
        url = f"{self.hub_url}/api/proposal/{proposal_id}/te_dkg"
        r = requests.post(url, json=body, timeout=self.timeout)
        if r.status_code >= 400:
            try:
                detail = r.json()
            except Exception:
                detail = {"text": r.text}
            raise HubClientError(f"POST {url} failed: {r.status_code} {detail}")
        return r.json()

    def get_aggregate(self, proposal_id: str) -> dict[str, Any]:
        """Fetch the persisted homomorphic aggregate from the hub.

        Tally worker (Phase 4) writes this once it has verified every
        ballot and homomorphically summed them.
        """
        url = f"{self.hub_url}/api/proposal/{proposal_id}/te_aggregate"
        r = requests.get(url, timeout=self.timeout)
        if r.status_code == 404:
            raise HubClientError("aggregate_not_ready")
        if r.status_code >= 400:
            try:
                detail = r.json()
            except Exception:
                detail = {"text": r.text}
            raise HubClientError(f"GET {url} failed: {r.status_code} {detail}")
        return r.json()

    def submit_decryption_share(
        self,
        proposal_id: str,
        keyper_index: int,
        candidate: int,
        sigma_hex: str,
        proof_e: int,
        proof_z: int,
    ) -> dict[str, Any]:
        """POST one (candidate, sigma, DLEQ proof) tuple to the hub."""
        payload_hash = _te_share_payload_hash(
            proposal_id, candidate, sigma_hex, proof_e, proof_z,
        )
        signature = _sign(self.private_key, payload_hash)
        body = {
            "keyper_index": keyper_index,
            "keyper_address": self.address,
            "candidate": candidate,
            "sigma": sigma_hex if sigma_hex.startswith("0x") else "0x" + sigma_hex,
            "proof_e": str(proof_e),
            "proof_z": str(proof_z),
            "signature": signature,
        }
        url = f"{self.hub_url}/api/proposal/{proposal_id}/te_decryption_share"
        r = requests.post(url, json=body, timeout=self.timeout)
        if r.status_code >= 400:
            try:
                detail = r.json()
            except Exception:
                detail = {"text": r.text}
            raise HubClientError(f"POST {url} failed: {r.status_code} {detail}")
        return r.json()
