#!/usr/bin/env python3
"""
Keyper Server — Individual threshold committee member.

Each keyper runs as an independent HTTP server and participates in:
  1. Distributed Key Generation (DKG) — generates secret share, verifies others' shares
  2. Partial Decryption — computes decryption shares with DLEQ correctness proofs

All operations use BLS12-381 G2.

Usage:
    python keyper.py --id 1 --port 5001
    python keyper.py --id 2 --port 5002
    python keyper.py --id 3 --port 5003
"""

import argparse
import base64
import hashlib
import logging
import os
import sys
import threading
import time
import requests
from cryptography.fernet import Fernet
from flask import Flask, request, jsonify

from eth_account import Account
from eth_account.messages import encode_defunct
from eth_utils import keccak

from crypto.primitives import (
    point_to_dict, dict_to_point, CURVE_ORDER,
    g2_to_compressed, g2_from_compressed,
    point_multiply,
)
from crypto.dkg import KeyperDKGState, derive_joint_mpk, derive_mpk_share
from dkg_persistence import (
    DkgEntry,
    load_dkg_secrets,
    prune_expired_dkg_secrets,
    retention_time,
    save_dkg_secrets,
    start_prune_loop,
)
import sdk_compat


# ----------------------------------------------------------------------
#  P2P signed-message helpers
#
#  Every keyper-to-keyper DKG message (commitments, shares, share
#  reveals during complaint resolution) is signed with the dealer's
#  Ethereum keyper key. Receivers verify the signature against the
#  member address at the dealer's index in ``KeyperSet`` (passed in via
#  /dkg/round1). Replaces the old anti-equivocation guarantee that the
#  bulletin board provided.
# ----------------------------------------------------------------------

_DST_COMMITMENTS = b"DKG-COMMITMENTS-v1"
_DST_SHARE = b"DKG-SHARE-v1"
_DST_REVEAL = b"DKG-REVEAL-v1"


def _commitments_payload_hash(election_id: str, dealer_id: int, commitments) -> bytes:
    parts = [
        _DST_COMMITMENTS,
        len(election_id).to_bytes(4, "big"),
        election_id.encode("utf-8"),
        dealer_id.to_bytes(8, "big"),
        len(commitments).to_bytes(4, "big"),
    ]
    for c in commitments:
        parts.append(g2_to_compressed(c))
    return keccak(b"".join(parts))


def _share_payload_hash(election_id: str, dealer_id: int, recipient_id: int, share: int) -> bytes:
    parts = [
        _DST_SHARE,
        len(election_id).to_bytes(4, "big"),
        election_id.encode("utf-8"),
        dealer_id.to_bytes(8, "big"),
        recipient_id.to_bytes(8, "big"),
        (share % CURVE_ORDER).to_bytes(32, "big"),
    ]
    return keccak(b"".join(parts))


def _reveal_payload_hash(election_id: str, dealer_id: int, recipient_id: int, share: int) -> bytes:
    parts = [
        _DST_REVEAL,
        len(election_id).to_bytes(4, "big"),
        election_id.encode("utf-8"),
        dealer_id.to_bytes(8, "big"),
        recipient_id.to_bytes(8, "big"),
        (share % CURVE_ORDER).to_bytes(32, "big"),
    ]
    return keccak(b"".join(parts))


def _sign(private_key: str, payload_hash: bytes) -> str:
    """EIP-191 personal-sign over a 32-byte payload hash; returns hex sig."""
    acct = Account.from_key(private_key)
    msg = encode_defunct(primitive=payload_hash)
    signed = acct.sign_message(msg)
    return signed.signature.hex()


def _recover(payload_hash: bytes, signature_hex: str) -> str:
    msg = encode_defunct(primitive=payload_hash)
    return Account.recover_message(msg, signature=bytes.fromhex(signature_hex.removeprefix("0x")))


# ----------------------------------------------------------------------
#  DKG secret persistence — see dkg_persistence.py
#
#  combined_share (the keyper's secret scalar for each proposal) is stored
#  encrypted on a Docker volume so it survives container restarts. After a
#  successful decrypt, shares are retained for KEYPER_DKG_RETENTION_TIME
#  (default 2) then pruned by a background thread.
# ----------------------------------------------------------------------

def _derive_fernet(private_key_hex: str) -> Fernet:
    raw = bytes.fromhex(private_key_hex.removeprefix('0x'))
    key = base64.urlsafe_b64encode(hashlib.sha256(b'KEYPER-DKG-STATE-v1' + raw).digest())
    return Fernet(key)


def create_keyper_app(keyper_id, *, hub_config=None, signing_key=None):
    """Create a Flask app for a single keyper.

    ``hub_config`` is an optional dict ``{"hub_url": str, "private_key": str}``
    that enables the publish-to-hub endpoints. The Snapshot hub replaces
    the on-chain ``Election`` contract as the authoritative collector for
    DKG results and decryption shares — see ``hub_client.HubClient``.

    ``signing_key`` is the Ethereum private key used to sign P2P DKG
    messages (commitments, shares, reveals). If omitted but
    ``hub_config`` is provided, the hub key doubles as the signing key.
    If neither is provided, a deterministic key is derived from
    ``keyper_id`` so off-chain dev runs and tests still work.
    """
    if signing_key is None:
        if hub_config is not None:
            signing_key = hub_config["private_key"]
        else:
            raise ValueError(
                "signing_key is required. Pass KEYPER_PRIVATE_KEY via the environment "
                "or --private-key on the command line."
            )
    signing_address = Account.from_key(signing_key).address
    logger = logging.getLogger(f'keyper.{keyper_id}')

    app = Flask(f"keyper_{keyper_id}")
    start_time = time.time()
    # Tracks when the most recent DKG round2 completed successfully.
    health_state = {"last_dkg_at": None}
    fernet = _derive_fernet(signing_key)
    dkg_state = KeyperDKGState()
    # Per-proposal key material retained after DKG round2.
    # dkg_state holds only the most recent ceremony; decryption must look up
    # the key for the specific proposal being decrypted, not the latest one.
    # Persisted encrypted to a Docker volume so restarts don't lose key material.
    completed_dkgs: dict[str, DkgEntry] = {}
    dkg_lock = threading.Lock()
    with dkg_lock:
        load_dkg_secrets(fernet, completed_dkgs, logger)
        prune_expired_dkg_secrets(fernet, completed_dkgs, logger)
    start_prune_loop(completed_dkgs, fernet, logger, dkg_lock)
    keyper_meta = {
        "id": keyper_id,
        "hub_config": hub_config,
        "signing_key": signing_key,
        "signing_address": signing_address,
    }
    # Per-DKG context: members[i] is the eth address of keyper id i+1 in
    # the KeyperSet, used to verify P2P signatures from that dealer. The
    # election_id scopes the signed payload to a specific DKG instance.
    dkg_meta = {"election_id": None, "members": []}
    # Local share storage (P2P).
    pending_shares = {}            # generated by us in round1, indexed by recipient_id
    received_shares = {}           # received from other keypers, indexed by dealer_id
    received_commitments = {}      # received commitments from peers, indexed by dealer_id
    # Snapshot of the commitments + dealer set used in the most recent
    # round-2 success. Reused by ``/dkg/publish_on_chain`` so the keyper
    # publishes the same DKG result it locally validated.
    last_round2 = {"all_commitments": None, "active_dealers": None}

    def _members_addr(dealer_id: int) -> str | None:
        idx = dealer_id - 1
        if 0 <= idx < len(dkg_meta["members"]):
            return dkg_meta["members"][idx]
        return None

    @app.route("/status", methods=["GET"])
    def status():
        return jsonify({
            "keyper_id": keyper_meta["id"],
            "address": keyper_meta["signing_address"],
            "dkg_completed": dkg_state.combined_share is not None,
            "public_key_share": point_to_dict(dkg_state.public_key_share) if dkg_state.public_key_share else None,
        })

    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({
            "ok": True,
            "dkg_in_progress": dkg_meta["election_id"] is not None and dkg_state.combined_share is None,
            "uptime_s": int(time.time() - start_time),
            "last_dkg_at": health_state["last_dkg_at"],
        })

    @app.route("/dkg/round1", methods=["POST"])
    def dkg_round1():
        """DKG Round 1: generate polynomial, commitments, and shares locally.

        Replaces the bulletin-board-anchored flow: commitments are kept
        locally and fanned out P2P via /dkg/distribute_commitments. The
        request body must include the keyper-set ``members`` (eth
        addresses, in member-index order) so this keyper can verify
        signatures on incoming P2P messages from other dealers.
        """
        data = request.get_json()
        n = int(data["n"])
        t = int(data["t"])
        kid = int(data["keyper_id"])
        election_id = data["election_id"]
        members = data.get("members", [])

        if kid != keyper_meta["id"]:
            return jsonify({"error": f"Keyper ID mismatch: configured as {keyper_meta['id']}, received {kid}"}), 400
        if not isinstance(members, list) or len(members) != n:
            return jsonify({"error": f"members must be a list of {n} addresses, got {len(members)}"}), 400

        logger.info("op=dkg_round1 proposal=%s n=%d t=%d", election_id, n, t)
        # Reset DKG state for this fresh run.
        commitments, shares = dkg_state.round1(kid, n, t)
        pending_shares.clear()
        pending_shares.update(shares)
        received_shares.clear()
        received_commitments.clear()
        # Our own commitments count as received from ourselves.
        received_commitments[kid] = list(commitments)

        # Pin the DKG context so subsequent endpoints can verify
        # signatures and reject messages from other elections.
        dkg_meta["election_id"] = election_id
        # ``members`` are 0x-prefixed mixed-case checksummed strings; the
        # ``Account.recover_message`` return matches that shape, and we
        # compare case-insensitively in the verify path anyway.
        dkg_meta["members"] = list(members)

        return jsonify({
            "keyper_id": kid,
            "status": "ok",
            # Backend gets our commitments via the response so it can build
            # its own off-chain view (used for off-chain mpk derivation and
            # cross-checking what each keyper reports it received).
            "commitments": [point_to_dict(c) for c in commitments],
        })

    @app.route("/dkg/distribute_commitments", methods=["POST"])
    def distribute_commitments():
        """Send our round-1 commitments to every other keyper, signed.

        Each peer's /dkg/receive_commitments verifies the signature
        against ``KeyperSet.getMember(kid - 1)``, replacing the bulletin
        board's anti-equivocation guarantee with a per-message
        unforgeability one. Equivocation across recipients still requires
        the dealer to produce two different signed messages for two
        different views — a real-time receiver-side cross-check (phase 2)
        would catch that locally; for phase 1 the on-chain
        ``voteDKGResult`` threshold-vote does so by failing to finalize.
        """
        data = request.get_json()
        keyper_urls = data["keyper_urls"]   # {keyper_id_str: url}
        kid = keyper_meta["id"]

        if dkg_meta["election_id"] is None:
            return jsonify({"error": "Run /dkg/round1 first"}), 400

        commitments = dkg_state.commitments
        payload_hash = _commitments_payload_hash(dkg_meta["election_id"], kid, commitments)
        signature = _sign(keyper_meta["signing_key"], payload_hash)
        body = {
            "election_id": dkg_meta["election_id"],
            "dealer_id": kid,
            "commitments": [point_to_dict(c) for c in commitments],
            "signature": signature,
        }

        for recipient_id_str, url in keyper_urls.items():
            recipient_id = int(recipient_id_str)
            if recipient_id == kid:
                continue   # we already have our own
            try:
                resp = requests.post(f"{url}/dkg/receive_commitments", json=body, timeout=10)
                resp.raise_for_status()
                logger.info("op=distribute_commitments proposal=%s recipient=%d status=ok",
                            dkg_meta["election_id"], recipient_id)
            except Exception as e:
                logger.error("op=distribute_commitments proposal=%s recipient=%d status=error err=%s",
                             dkg_meta["election_id"], recipient_id, e)
                return jsonify({
                    "error": f"Failed to send commitments to keyper {recipient_id}: {e}",
                }), 500

        return jsonify({"status": "ok"})

    @app.route("/dkg/receive_commitments", methods=["POST"])
    def receive_commitments():
        """Receive signed commitments from another keyper.

        Append-only: a second post from the same dealer is rejected so a
        real dealer that posted first cannot be overwritten by a later
        forgery (the signature check below already rules out forgeries
        from non-dealer parties).
        """
        data = request.get_json()
        try:
            election_id = data["election_id"]
            dealer_id = int(data["dealer_id"])
            commitments_dicts = data["commitments"]
            sig_hex = data["signature"]
        except (KeyError, ValueError, TypeError) as e:
            return jsonify({"error": f"Bad request: {e}"}), 400

        if election_id != dkg_meta.get("election_id"):
            return jsonify({"error": "Election ID mismatch"}), 400
        if dealer_id in received_commitments:
            return jsonify({"error": "Commitments already received from this dealer"}), 409

        try:
            commitments = [dict_to_point(c) for c in commitments_dicts]
        except Exception as e:
            return jsonify({"error": f"Invalid commitment point: {e}"}), 400

        expected = _members_addr(dealer_id)
        if expected is None:
            return jsonify({"error": f"Unknown dealer_id {dealer_id}"}), 400
        payload_hash = _commitments_payload_hash(election_id, dealer_id, commitments)
        try:
            recovered = _recover(payload_hash, sig_hex)
        except Exception as e:
            logger.warning("op=receive_commitments proposal=%s dealer=%d status=sig_error err=%s",
                           election_id, dealer_id, e)
            return jsonify({"error": f"Signature recover failed: {e}"}), 401
        if recovered.lower() != expected.lower():
            logger.warning("op=receive_commitments proposal=%s dealer=%d status=bad_sig "
                           "expected=%s recovered=%s", election_id, dealer_id, expected, recovered)
            return jsonify({
                "error": f"Bad signature: expected {expected}, recovered {recovered}",
            }), 401

        received_commitments[dealer_id] = commitments
        logger.info("op=receive_commitments proposal=%s dealer=%d status=ok", election_id, dealer_id)
        return jsonify({"status": "ok"})

    @app.route("/dkg/distribute_shares", methods=["POST"])
    def distribute_shares():
        """Send our secret shares directly to each recipient keyper, signed."""
        data = request.get_json()
        keyper_urls = data["keyper_urls"]   # {keyper_id_str: url}
        kid = keyper_meta["id"]

        if dkg_meta["election_id"] is None:
            return jsonify({"error": "Run /dkg/round1 first"}), 400

        logger.info("op=distribute_shares proposal=%s", dkg_meta["election_id"])
        for recipient_id_str, url in keyper_urls.items():
            recipient_id = int(recipient_id_str)
            share_val = pending_shares[recipient_id]
            if recipient_id == kid:
                received_shares[kid] = share_val
                continue
            payload_hash = _share_payload_hash(
                dkg_meta["election_id"], kid, recipient_id, share_val,
            )
            signature = _sign(keyper_meta["signing_key"], payload_hash)
            try:
                resp = requests.post(f"{url}/dkg/receive_share", json={
                    "election_id": dkg_meta["election_id"],
                    "dealer_id": kid,
                    "recipient_id": recipient_id,
                    "share": str(share_val),
                    "signature": signature,
                }, timeout=10)
                resp.raise_for_status()
            except Exception as e:
                return jsonify({"error": f"Failed to send share to keyper {recipient_id}: {e}"}), 500

        return jsonify({"status": "ok"})

    @app.route("/dkg/receive_share", methods=["POST"])
    def receive_share():
        """Receive a signed secret share from another keyper.

        Append-only per dealer; signature is checked against the dealer's
        keyper-set member address.
        """
        data = request.get_json()
        try:
            election_id = data["election_id"]
            dealer_id = int(data["dealer_id"])
            recipient_id = int(data["recipient_id"])
            share = int(data["share"])
            sig_hex = data["signature"]
        except (KeyError, ValueError, TypeError) as e:
            return jsonify({"error": f"Bad request: {e}"}), 400

        if election_id != dkg_meta.get("election_id"):
            return jsonify({"error": "Election ID mismatch"}), 400
        if recipient_id != keyper_meta["id"]:
            return jsonify({"error": f"Recipient mismatch: this is keyper {keyper_meta['id']}"}), 400
        if share < 0 or share >= CURVE_ORDER:
            return jsonify({"error": "Share value out of scalar field range"}), 400
        if dealer_id in received_shares:
            return jsonify({"error": "Share already received from this dealer"}), 409

        expected = _members_addr(dealer_id)
        if expected is None:
            return jsonify({"error": f"Unknown dealer_id {dealer_id}"}), 400
        payload_hash = _share_payload_hash(election_id, dealer_id, recipient_id, share)
        try:
            recovered = _recover(payload_hash, sig_hex)
        except Exception as e:
            logger.warning("op=receive_share proposal=%s dealer=%d status=sig_error err=%s",
                           election_id, dealer_id, e)
            return jsonify({"error": f"Signature recover failed: {e}"}), 401
        if recovered.lower() != expected.lower():
            logger.warning("op=receive_share proposal=%s dealer=%d status=bad_sig "
                           "expected=%s recovered=%s", election_id, dealer_id, expected, recovered)
            return jsonify({
                "error": f"Bad signature: expected {expected}, recovered {recovered}",
            }), 401

        received_shares[dealer_id] = share
        logger.info("op=receive_share proposal=%s dealer=%d status=ok", election_id, dealer_id)
        return jsonify({"status": "ok"})

    @app.route("/dkg/reveal_share", methods=["POST"])
    def reveal_share():
        """Signed Feldman-VSS rebuttal: dealer publicly reveals the share
        it generated for a specific recipient.

        Backend collects the reveal and the dealer's commitments and
        independently checks ``share · P₂ == Σⱼ recipient^j · γⱼ``. If
        the equation holds, the complaining keyper lied; otherwise the
        dealer did. The signature is bound to the same payload format the
        recipient would have received in /dkg/receive_share.
        """
        data = request.get_json()
        try:
            recipient_id = int(data["recipient_id"])
        except (KeyError, ValueError, TypeError) as e:
            return jsonify({"error": f"Bad request: {e}"}), 400
        if recipient_id not in pending_shares:
            return jsonify({"error": f"No pending share for recipient {recipient_id}"}), 404

        kid = keyper_meta["id"]
        share = pending_shares[recipient_id]
        payload_hash = _reveal_payload_hash(
            dkg_meta["election_id"], kid, recipient_id, share,
        )
        signature = _sign(keyper_meta["signing_key"], payload_hash)

        return jsonify({
            "dealer_id": kid,
            "recipient_id": recipient_id,
            "election_id": dkg_meta["election_id"],
            "share": str(share),
            "signature": signature,
            "signing_address": keyper_meta["signing_address"],
        })

    @app.route("/dkg/round2", methods=["POST"])
    def dkg_round2():
        """DKG Round 2: verify received shares and compute combined secret share.

        All commitments come from local state populated by
        /dkg/receive_commitments — the bulletin board is gone.
        """
        data = request.get_json() or {}
        # ``data`` may carry an election_id for cross-checking; not strictly
        # required since round 1 already pinned it.
        if data.get("election_id") and data["election_id"] != dkg_meta.get("election_id"):
            return jsonify({"error": "Election ID mismatch"}), 400

        all_commitments = dict(received_commitments)

        try:
            combined_share, public_key_share = dkg_state.round2(all_commitments, received_shares)
        except ValueError as e:
            # Use structured bad_dealers attribute from DKG (no regex parsing)
            bad_dealers = getattr(e, "bad_dealers", [])
            logger.warning("op=dkg_round2 proposal=%s status=complaints dealers=%s err=%s",
                           dkg_meta.get("election_id"), bad_dealers, e)
            return jsonify({
                "keyper_id": keyper_meta["id"],
                "verified": False,
                "complaints": bad_dealers,
                "error": str(e),
            }), 200  # 200 so backend can parse the complaint

        logger.info("op=dkg_round2 proposal=%s status=verified dealers=%s",
                    dkg_meta.get("election_id"), sorted(received_shares.keys()))
        health_state["last_dkg_at"] = int(time.time())
        # Persist key material per proposal so decryption can retrieve the
        # correct share regardless of how many subsequent DKGs have run.
        # expires_at = proposal end time + retention window, set now so entries
        # for zero-vote proposals are pruned automatically after they close.
        if dkg_meta.get("election_id"):
            proposal_end_time = data.get("proposal_end_time")
            expires_at = None
            if proposal_end_time is not None:
                expires_at = int(proposal_end_time) + int(retention_time())
            with dkg_lock:
                completed_dkgs[dkg_meta["election_id"]] = DkgEntry(combined_share, expires_at=expires_at)
                save_dkg_secrets(fernet, completed_dkgs)
        # Snapshot what we just consumed so a subsequent on-chain publish
        # uses the identical commitment set.
        last_round2["all_commitments"] = dict(all_commitments)
        last_round2["active_dealers"] = sorted(received_shares.keys())

        # Zeroize received shares after DKG completes.
        # Keep pending_shares alive until complaint resolution completes;
        # they will be cleared at the start of the next round1.
        received_shares.clear()

        return jsonify({
            "keyper_id": keyper_meta["id"],
            "public_key_share": point_to_dict(public_key_share),
            "verified": True,
        })

    @app.route("/dkg/publish_on_chain", methods=["POST"])
    def publish_on_chain():
        """Submit the DKG result to the Snapshot hub.

        The endpoint name is kept (``/dkg/publish_on_chain``) so the
        existing ``dkg_coordinator.py`` orchestration script is unchanged.
        Internally this no longer talks to a smart contract: it computes
        ``(mpk, committee_pks)`` from the locally validated round-2
        commitments and POSTs them, EIP-191 signed, to the hub. The hub
        finalises the proposal row once threshold-many keypers report
        identical values.

        Reuses the commitments captured during the most recent successful
        round-2 so the submission matches what was locally validated.
        """
        if keyper_meta["hub_config"] is None:
            return jsonify({"error": "Keyper not configured with hub credentials"}), 400

        if last_round2["all_commitments"] is None:
            return jsonify({"error": "No completed round-2 to publish; run DKG first"}), 400

        data = request.get_json() or {}
        # ``election_address`` is the hub's term for the proposal id
        # (a hex-string id, e.g. ``0x...``). We accept either ``proposal_id``
        # (preferred for the hub transport) or ``election_address`` (legacy
        # name from the on-chain coordinator) for backwards compatibility
        # with the unmodified ``dkg_coordinator.py``.
        proposal_id = data.get("proposal_id") or data.get("election_address")
        if not proposal_id:
            return jsonify({"error": "Missing proposal_id"}), 400

        all_commitments = last_round2["all_commitments"]
        active_dealers = last_round2["active_dealers"]

        # The committee size is the configured n; missing dealer commitments
        # are still derivable from surviving ones via Lagrange in the public
        # domain (handled by ``derive_mpk_share``).
        n = data.get("n") or len(active_dealers)

        try:
            pk_election_pt = derive_joint_mpk(all_commitments)
            pk_election = g2_to_compressed(pk_election_pt)
            committee_pks = []
            for k in range(1, n + 1):
                mpk_k = derive_mpk_share(k, all_commitments)
                committee_pks.append(g2_to_compressed(mpk_k))
        except Exception as e:
            return jsonify({"error": f"Failed to derive DKG result: {e}"}), 500

        from hub_client import HubClient, HubClientError
        cfg = keyper_meta["hub_config"]
        client = HubClient(cfg["hub_url"], cfg["private_key"])
        logger.info("op=publish_dkg proposal=%s n=%d", proposal_id, n)
        try:
            resp = client.submit_dkg_result(
                proposal_id=proposal_id,
                keyper_index=keyper_meta["id"],
                mpk_hex="0x" + pk_election.hex(),
                committee_pks_hex=["0x" + p.hex() for p in committee_pks],
            )
        except HubClientError as e:
            logger.error("op=publish_dkg proposal=%s status=error err=%s", proposal_id, e)
            return jsonify({"error": f"submit_dkg_result failed: {e}"}), 502

        logger.info("op=publish_dkg proposal=%s status=submitted", proposal_id)
        return jsonify({
            "keyper_id": keyper_meta["id"],
            "hub_response": resp,
            "pk_election": pk_election.hex(),
            "committee_pks": [p.hex() for p in committee_pks],
        })

    @app.route("/decrypt/publish_on_chain", methods=["POST"])
    def publish_decryption_share():
        """Submit per-candidate decryption shares to the Snapshot hub.

        Reads the homomorphic aggregate from
        ``GET /api/proposal/{id}/te_aggregate`` (written by the sequencer's
        tally worker, Phase 4), computes a partial decryption share per
        candidate, proves correctness with a DLEQ under the SDK
        ``SHUTTER-VOTE-DECRYPT-v1`` transcript, and POSTs each share to
        ``POST /api/proposal/{id}/te_decryption_share``.

        Idempotent at the hub: the shares table PK is
        ``(proposal_id, keyper_index, candidate)``.
        """
        if keyper_meta["hub_config"] is None:
            return jsonify({"error": "Keyper not configured with hub credentials"}), 400

        data = request.get_json() or {}
        proposal_id = data.get("proposal_id") or data.get("election_address")
        if not proposal_id:
            return jsonify({"error": "Missing proposal_id"}), 400

        with dkg_lock:
            entry = completed_dkgs.get(proposal_id)
        if entry is None:
            return jsonify({"error": f"DKG not completed for proposal {proposal_id}"}), 400
        msk_k, mpk_k = entry.combined_share, entry.public_key_share

        from hub_client import HubClient, HubClientError
        cfg = keyper_meta["hub_config"]
        client = HubClient(cfg["hub_url"], cfg["private_key"])

        try:
            aggregate = client.get_aggregate(proposal_id)
        except HubClientError as e:
            return jsonify({"error": f"Aggregate not yet available: {e}"}), 400

        # Hub aggregate shape (Phase 4): {
        #   "election_id": str,           # proposal id used in transcripts
        #   "num_candidates": int,
        #   "ciphertexts": [{"c1": "0x...", "c2": "0x..."}, ...]   # compressed G2 hex
        # }
        try:
            election_id = aggregate["election_id"]
            num_candidates = int(aggregate["num_candidates"])
            ciphertexts = aggregate["ciphertexts"]
        except (KeyError, ValueError, TypeError) as e:
            return jsonify({"error": f"Bad aggregate shape: {e}"}), 502

        # Snapshot proposal ids are 0x-prefixed hex (32 bytes). The SDK's
        # decrypt transcript binds 32 raw bytes; converting via int(...,16)
        # yields the same bytes that arrayify(proposalId) gives the JS side.
        if isinstance(election_id, str) and election_id.startswith("0x"):
            election_id = int(election_id, 16)
        elif isinstance(election_id, str):
            election_id = int(election_id)

        if len(ciphertexts) != num_candidates:
            return jsonify({"error": f"Aggregate length {len(ciphertexts)} != numCandidates {num_candidates}"}), 502

        keyper_index = keyper_meta["id"]

        logger.info("op=publish_decrypt proposal=%s candidates=%d", proposal_id, num_candidates)
        submitted = []
        for j in range(num_candidates):
            try:
                C1 = g2_from_compressed(bytes.fromhex(ciphertexts[j]["c1"].removeprefix("0x")))
                C2 = g2_from_compressed(bytes.fromhex(ciphertexts[j]["c2"].removeprefix("0x")))
            except Exception as e:
                logger.error("op=publish_decrypt proposal=%s candidate=%d status=bad_ciphertext err=%s",
                             proposal_id, j, e)
                return jsonify({"error": f"Aggregate ciphertext {j} invalid: {e}"}), 502

            sigma = point_multiply(C1, msk_k)
            t_transcript = sdk_compat.make_onchain_decrypt_transcript(election_id, j)
            e_scalar, z_scalar = sdk_compat.prove_decryption_share(
                t_transcript, C1, C2, mpk_k, sigma, msk_k, keyper_index,
            )
            sigma_hex = "0x" + g2_to_compressed(sigma).hex()
            try:
                resp = client.submit_decryption_share(
                    proposal_id=proposal_id,
                    keyper_index=keyper_index,
                    candidate=j,
                    sigma_hex=sigma_hex,
                    proof_e=e_scalar,
                    proof_z=z_scalar,
                )
                logger.info("op=publish_decrypt proposal=%s candidate=%d status=submitted", proposal_id, j)
            except HubClientError as e:
                logger.error("op=publish_decrypt proposal=%s candidate=%d status=error err=%s",
                             proposal_id, j, e)
                return jsonify({
                    "error": f"submit_decryption_share failed at candidate {j}: {e}",
                    "submitted": submitted,
                }), 502
            submitted.append({"candidate": j, "hub_response": resp})

        return jsonify({
            "keyper_id": keyper_index,
            "shares_count": num_candidates,
            "submitted": submitted,
        })

    return app


def main():
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s %(levelname)s [%(name)s] %(message)s',
        datefmt='%Y-%m-%dT%H:%M:%S',
    )
    parser = argparse.ArgumentParser(description="Keyper server for threshold ElGamal voting")
    parser.add_argument("--id", type=int, required=True, help="Keyper ID (1-indexed)")
    parser.add_argument("--port", type=int, required=True, help="Port to listen on")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to")
    parser.add_argument("--hub-url", default=None,
                        help="Snapshot hub base URL; required to publish DKG results and decryption shares")
    parser.add_argument("--private-key", default=None,
                        help=("Hex private key with 0x prefix used to sign hub-bound DKG/decryption-share "
                              "submissions. Prefer KEYPER_PRIVATE_KEY env var."))
    args = parser.parse_args()

    private_key = args.private_key or os.environ.get("KEYPER_PRIVATE_KEY")
    if not private_key:
        sys.exit(
            "Error: KEYPER_PRIVATE_KEY is required.\n"
            "Generate a fresh key with:\n"
            "  python -c \"from eth_account import Account; import secrets; "
            "k=secrets.token_bytes(32); print('0x'+k.hex())\""
        )
    hub_url = args.hub_url or os.environ.get("KEYPER_HUB_URL")
    hub_config = None
    if hub_url and private_key:
        hub_config = {"hub_url": hub_url, "private_key": private_key}

    # Same key signs both the hub-bound submissions and the P2P DKG messages
    # so the recovered address matches the expected keyper-set entry.
    app = create_keyper_app(args.id, hub_config=hub_config, signing_key=private_key)
    startup_log = logging.getLogger(f'keyper.{args.id}')
    startup_log.info("starting host=%s port=%d hub=%s address=%s",
                     args.host, args.port,
                     hub_url or "disabled",
                     Account.from_key(private_key).address)
    app.run(host=args.host, port=args.port, debug=False, use_reloader=False)


if __name__ == "__main__":
    main()
