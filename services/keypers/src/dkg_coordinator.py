#!/usr/bin/env python3
"""
DKG coordinator — orchestrates the keyper HTTP APIs for Feldman VSS DKG.

Flow (matches RUNNING.md):
  round1 → distribute_commitments → distribute_shares → round2 → publish_on_chain
"""

from __future__ import annotations

import argparse
import logging
import sys
import time
from dataclasses import dataclass
from typing import Any, Optional

import requests

log = logging.getLogger('dkg')


class DKGCoordinatorError(RuntimeError):
    pass


@dataclass(frozen=True)
class Keyper:
    kid: int
    url: str


def _keypers_from_urls(urls: list[str]) -> list[Keyper]:
    # Assuming keyper ids are 1-indexed. ie 1,2,3
    return [Keyper(kid=i + 1, url=u.rstrip("/")) for i, u in enumerate(urls)]


def fetch_members_from_status(keypers: list[Keyper], *, timeout: float = 5.0) -> list[str]:
    """
    Fetch the expected DKG `members` list from each keyper `/status`.
    We take the first successful set (and sanity-check that all match).
    """
    members_by_kid: dict[int, str] = {}
    for kp in keypers:
        r = requests.get(f"{kp.url}/status", timeout=timeout)
        r.raise_for_status()
        j = r.json()
        addr = j.get("address")
        if not isinstance(addr, str) or not addr.startswith("0x"):
            raise DKGCoordinatorError(f"{kp.url}/status missing/invalid address")
        members_by_kid[kp.kid] = addr

    # Deterministic, member-index order = keyper_id order.
    return [members_by_kid[kp.kid] for kp in keypers]


def build_keyper_urls_map(keypers: list[Keyper]) -> dict[str, str]:
    # Keyper APIs expect a dict keyed by string keyper_id.
    return {str(kp.kid): kp.url for kp in keypers}


def _post(url: str, path: str, payload: dict[str, Any], *, timeout: float) -> dict[str, Any]:
    r = requests.post(f"{url}{path}", json=payload, timeout=timeout)
    if r.status_code >= 400:
        try:
            body = r.json()
        except Exception:
            body = {"text": r.text}
        log.error("http_error url=%s path=%s status=%d body=%s", url, path, r.status_code, body)
        raise DKGCoordinatorError(f"POST {path} failed on {url}: {r.status_code} {body}")
    try:
        return r.json()
    except Exception:
        return {}


def run_dkg(
    *,
    keyper_urls: list[str],
    election_id: str,
    election_address: str,
    n: int,
    t: int,
    members: Optional[list[str]] = None,
    timeout: float = 60.0,
    sleep_between: float = 0.0,
    proposal_end_time: Optional[int] = None,
) -> None:
    """
    Orchestrate DKG across keypers and publish the DKG result on-chain.
    """
    keypers = _keypers_from_urls(keyper_urls)
    if len(keypers) != n:
        raise DKGCoordinatorError(f"n={n} but got {len(keypers)} keyper URLs")
    if members is None:
        members = fetch_members_from_status(keypers, timeout=min(timeout, 10.0))
    if len(members) != n:
        raise DKGCoordinatorError(f"members length {len(members)} != n {n}")

    keyper_urls_map = build_keyper_urls_map(keypers)

    log.info("op=dkg_start proposal=%s n=%d t=%d keypers=%s",
             election_id, n, t, [kp.url for kp in keypers])

    # round1
    for kp in keypers:
        log.info("op=dkg_round1 proposal=%s keyper=%d", election_id, kp.kid)
        _post(
            kp.url,
            "/dkg/round1",
            {"n": n, "t": t, "keyper_id": kp.kid, "election_id": election_id, "members": members},
            timeout=timeout,
        )
        if sleep_between:
            time.sleep(sleep_between)

    # distribute commitments
    for kp in keypers:
        log.info("op=dkg_distribute_commitments proposal=%s keyper=%d", election_id, kp.kid)
        _post(kp.url, "/dkg/distribute_commitments", {"keyper_urls": keyper_urls_map}, timeout=timeout)
        if sleep_between:
            time.sleep(sleep_between)

    # distribute shares
    for kp in keypers:
        log.info("op=dkg_distribute_shares proposal=%s keyper=%d", election_id, kp.kid)
        _post(kp.url, "/dkg/distribute_shares", {"keyper_urls": keyper_urls_map}, timeout=timeout)
        if sleep_between:
            time.sleep(sleep_between)

    # round2
    round2_payload: dict[str, Any] = {"election_id": election_id}
    if proposal_end_time is not None:
        round2_payload["proposal_end_time"] = proposal_end_time
    for kp in keypers:
        log.info("op=dkg_round2 proposal=%s keyper=%d", election_id, kp.kid)
        _post(kp.url, "/dkg/round2", round2_payload, timeout=timeout)
        if sleep_between:
            time.sleep(sleep_between)

    # publish on chain
    for kp in keypers:
        log.info("op=dkg_publish proposal=%s keyper=%d", election_id, kp.kid)
        _post(
            kp.url,
            "/dkg/publish_on_chain",
            {"election_address": election_address, "n": n},
            timeout=timeout,
        )
        if sleep_between:
            time.sleep(sleep_between)

    log.info("op=dkg_done proposal=%s", election_id)


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s %(levelname)s [%(name)s] %(message)s',
        datefmt='%Y-%m-%dT%H:%M:%S',
    )
    p = argparse.ArgumentParser(description="DKG coordinator (keyper HTTP orchestrator)")
    p.add_argument("--keyper-urls", required=True, help="Comma-separated keyper base URLs")
    p.add_argument("--election-id", required=True, help="Opaque election id string for keypers (e.g. demo-election)")
    p.add_argument("--election-address", required=True, help="Election contract address (0x...)")
    p.add_argument("--n", type=int, required=True, help="Number of keypers")
    p.add_argument("--t", type=int, required=True, help="Threshold degree (need t+1 shares)")
    p.add_argument("--timeout", type=float, default=60.0, help="Per-request timeout seconds (default 60)")
    p.add_argument("--sleep-between", type=float, default=0.0, help="Sleep seconds between requests (default 0)")
    args = p.parse_args()

    keyper_urls = [u.strip() for u in args.keyper_urls.split(",") if u.strip()]
    run_dkg(
        keyper_urls=keyper_urls,
        election_id=args.election_id,
        election_address=args.election_address,
        n=args.n,
        t=args.t,
        timeout=args.timeout,
        sleep_between=args.sleep_between,
    )


if __name__ == "__main__":
    try:
        main()
    except DKGCoordinatorError as e:
        log.error("fatal err=%s", e)
        raise SystemExit(2)
