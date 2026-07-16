#!/usr/bin/env python3
"""Container-aware auto-DKG coordinator.

Polls the hub database for permanent-private (``privacy='shutter-elgamal'``)
proposals whose threshold key has not been generated yet (``te_mpk IS NULL``)
and drives the distributed key generation ceremony against the keyper
committee automatically. As soon as a proposal is created, the committee
derives the master public key within a couple of seconds so the UI can start
encrypting ballots.

This is the dockerised counterpart of ``scripts/auto_dkg.py``: instead of the
hard-coded ``localhost`` endpoints used for host-run dev, every endpoint is
read from the environment so it works inside a compose network.

Environment:
  KEYPER_URLS          Comma-separated keyper base URLs.
                       Default: http://keyper1:5001,http://keyper2:5002,http://keyper3:5003
  TE_THRESHOLD_T       Threshold degree t (need t+1 shares). Default: 1.
  TE_WEIGHTED_BUDGET   Denominator for weighted vote splits (e.g. 100 = percentages,
                       1000 = 0.1% granularity). Default: 100.
  POLL_INTERVAL_S      Seconds between DB polls. Default: 2.
  HUB_DB_HOST          MySQL host. Default: mysql
  HUB_DB_PORT          MySQL port. Default: 3306
  HUB_DB_USER          MySQL user. Default: root
  HUB_DB_PASSWORD      MySQL password. Default: "" (empty)
  HUB_DB_NAME          Hub database name. Default: snapshot_hub
"""
from __future__ import annotations

import json
import logging
import os
import time

import pymysql

from dkg_coordinator import (  # vendored in this image at /app/src
    run_dkg,
    fetch_members_from_status,
    _keypers_from_urls,
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s [auto-dkg] %(message)s',
    datefmt='%Y-%m-%dT%H:%M:%S',
)
log = logging.getLogger('auto-dkg')

POLL_INTERVAL_S = float(os.environ.get("POLL_INTERVAL_S", "2"))
# Retry budget and exponential backoff parameters.
MAX_ATTEMPTS = 5
BACKOFF_BASE_S = 10        # minimum delay between retries (floor)
BACKOFF_CAP_S = 500        # maximum single delay (cap)
LAST_ATTEMPT_MARGIN_S = 10 # fire the final retry at least this many seconds before start
DEFAULT_T = int(os.environ.get("TE_THRESHOLD_T", "1"))
DEFAULT_BUDGET = 1
WEIGHTED_BUDGET = int(os.environ.get("TE_WEIGHTED_BUDGET", "100"))
DEFAULT_MODE = "exact"


def _keyper_urls() -> list[str]:
    raw = os.environ.get(
        "KEYPER_URLS",
        "http://keyper1:5001,http://keyper2:5002,http://keyper3:5003",
    )
    return [u.strip().rstrip("/") for u in raw.split(",") if u.strip()]



def _db_connect():
    return pymysql.connect(
        host=os.environ.get("HUB_DB_HOST", "mysql"),
        port=int(os.environ.get("HUB_DB_PORT", "3306")),
        user=os.environ.get("HUB_DB_USER", "root"),
        password=os.environ.get("HUB_DB_PASSWORD", ""),
        database=os.environ.get("HUB_DB_NAME", "snapshot_hub"),
        charset="utf8mb4",
        autocommit=True,
    )


KEYPER_URLS = _keyper_urls()


def _mark_dkg_failed(pid: str) -> None:
    """Write te_dkg_status='dkg_failed' so the poll query stops retrying."""
    conn = _db_connect()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE proposals SET te_dkg_status='dkg_failed' WHERE id=%s",
                (pid,)
            )
    finally:
        conn.close()


def _on_failure(
    pid: str,
    reason: str,
    proposal_start: int,
    attempt_count: dict[str, int],
    next_retry_at: dict[str, float],
) -> None:
    """Record a DKG attempt failure. Backoff is proportional to the remaining
    time before the proposal opens: retries are spaced evenly within that window
    so the most urgent proposals always get the fastest retries. Marks the
    proposal permanently failed in the DB after MAX_ATTEMPTS."""
    attempt = attempt_count.get(pid, 0) + 1
    attempt_count[pid] = attempt

    if attempt >= MAX_ATTEMPTS:
        log.error(
            "op=dkg_permanently_failed proposal=%s attempts=%d reason=%s "
            "-- set te_dkg_status=NULL in the DB to retry",
            pid, attempt, reason,
        )
        _mark_dkg_failed(pid)
        attempt_count.pop(pid, None)
        next_retry_at.pop(pid, None)
    else:
        remaining_attempts = MAX_ATTEMPTS - attempt
        time_until_start = max(0.0, proposal_start - time.time())
        # Exponential geometric series: delays double each attempt and sum to
        # exactly the usable budget (time left minus the last-attempt margin).
        # d + 2d + 4d + ... + 2^(n-1)d = d * (2^n - 1) = budget
        # => d = budget / (2^n - 1)
        budget = max(0.0, time_until_start - LAST_ATTEMPT_MARGIN_S)
        slots = (2 ** remaining_attempts) - 1
        delay = min(
            max(float(BACKOFF_BASE_S), budget / slots),
            float(BACKOFF_CAP_S),
        )
        next_retry_at[pid] = time.time() + delay
        log.warning(
            "op=dkg_retry proposal=%s attempt=%d/%d delay_s=%.0f "
            "time_until_start=%.0f reason=%s",
            pid, attempt, MAX_ATTEMPTS, delay, time_until_start, reason,
        )


def _ensure_dkg(pid: str, choices: list, vote_type: str, end_time: int) -> bool:
    """Populate te_* config and run DKG for one proposal. Returns True on success."""
    n = len(KEYPER_URLS)
    t = DEFAULT_T
    keypers = _keypers_from_urls(KEYPER_URLS)
    keyper_addrs = fetch_members_from_status(keypers)
    num_candidates = len(choices)
    # Weighted proposals encode proportional splits as integers out of WEIGHTED_BUDGET
    # (e.g. 60+40=100); the tally path divides recovered sums by budget at the end.
    budget = WEIGHTED_BUDGET if vote_type == "weighted" else DEFAULT_BUDGET
    te_config = {
        "numCandidates": num_candidates,
        "budget": budget,
        "mode": DEFAULT_MODE,
        "variant": "A",
    }

    conn = _db_connect()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE proposals
                   SET te_threshold_t=%s,
                       te_threshold_n=%s,
                       te_keyper_urls=%s,
                       te_keyper_addresses=%s,
                       te_config=%s
                 WHERE id=%s
                """,
                (
                    t, n,
                    json.dumps(KEYPER_URLS),
                    json.dumps(keyper_addrs),
                    json.dumps(te_config),
                    pid,
                ),
            )
    finally:
        conn.close()

    log.info("op=dkg_start proposal=%s n=%d t=%d candidates=%d budget=%d vote_type=%s",
             pid, n, t, num_candidates, budget, vote_type)
    run_dkg(
        keyper_urls=KEYPER_URLS,
        election_id=pid,
        election_address=pid,
        n=n, t=t,
        members=keyper_addrs,
        proposal_end_time=end_time,
    )

    deadline = time.time() + 30
    while time.time() < deadline:
        conn = _db_connect()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT HEX(te_mpk) FROM proposals WHERE id=%s", (pid,))
                row = cur.fetchone()
        finally:
            conn.close()
        if row and row[0]:
            log.info("op=dkg_complete proposal=%s status=ok", pid)
            return True
        time.sleep(0.5)

    log.error("op=dkg_complete proposal=%s status=timeout", pid)
    return False


def run_forever(poll_interval_s: float = POLL_INTERVAL_S) -> None:
    log.info("coordinator started poll_interval=%.1fs keypers=%s t=%d",
             poll_interval_s, KEYPER_URLS, DEFAULT_T)

    # Per-proposal retry state (in-memory; resets on restart, which is fine
    # since a restart is an intentional operator action that clears backoff).
    attempt_count: dict[str, int] = {}
    next_retry_at: dict[str, float] = {}

    while True:
        try:
            conn = _db_connect()
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT id, choices, type, end, start FROM proposals "
                        "WHERE privacy='shutter-elgamal' AND te_mpk IS NULL "
                        "AND (te_dkg_status IS NULL OR te_dkg_status = '') "
                        "ORDER BY start ASC"
                    )
                    rows = cur.fetchall()
            finally:
                conn.close()
            for pid, choices_json, vote_type, end_time, start_time in rows:
                # skip until backoff window expires.
                if time.time() < next_retry_at.get(pid, 0):
                    continue
                choices = (
                    json.loads(choices_json)
                    if isinstance(choices_json, str)
                    else choices_json
                )
                try:
                    ok = _ensure_dkg(pid, choices, vote_type or "single-choice", end_time)
                    if ok:
                        attempt_count.pop(pid, None)
                        next_retry_at.pop(pid, None)
                    else:
                        _on_failure(pid, "timeout", start_time, attempt_count, next_retry_at)
                except Exception as e:  # noqa: BLE001
                    _on_failure(pid, str(e), start_time, attempt_count, next_retry_at)
        except Exception as e:  # noqa: BLE001
            log.error("poll_error err=%s", e)
        time.sleep(poll_interval_s)

if __name__ == "__main__":
    try:
        run_forever()
    except KeyboardInterrupt:
        log.info("stopped")
