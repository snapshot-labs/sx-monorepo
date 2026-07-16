"""Encrypted persistence and retention for per-proposal DKG secret shares."""

from __future__ import annotations

import json
import logging
import os
import pathlib
import threading
import time
from dataclasses import dataclass

from cryptography.fernet import Fernet, InvalidToken

from crypto.primitives import G2, point_multiply


@dataclass
class DkgEntry:
    """Per-proposal DKG secret — mirrors the on-disk JSON row."""

    combined_share: int
    expires_at: int | None = None

    @property
    def public_key_share(self):
        return point_multiply(G2, self.combined_share)


def retention_time() -> float:
    raw = os.environ.get("KEYPER_DKG_RETENTION_TIME")
    if raw is None:
        raise RuntimeError(
            "KEYPER_DKG_RETENTION_TIME is required "
            "(set in docker-compose or .env; 0 disables pruning)"
        )
    return float(raw)


def prune_interval_s() -> float:
    return float(os.environ.get("KEYPER_DKG_PRUNE_INTERVAL_S", "3600"))


def state_file() -> pathlib.Path:
    d = pathlib.Path(os.environ.get("KEYPER_STATE_DIR", "/keyper-state"))
    d.mkdir(parents=True, exist_ok=True)
    return d / "dkg_secrets.enc"


def _entry_from_raw(raw: dict) -> DkgEntry:
    share = int(raw["share"], 16)
    raw_expires = raw.get("expires_at")
    expires_at = int(raw_expires) if raw_expires is not None else None
    return DkgEntry(share, expires_at=expires_at)


def save_dkg_secrets(fernet: Fernet, completed_dkgs: dict[str, DkgEntry]) -> None:
    data = {}
    for pid, entry in completed_dkgs.items():
        row: dict[str, float | str] = {"share": hex(entry.combined_share)}
        if entry.expires_at is not None:
            row["expires_at"] = entry.expires_at
        data[pid] = row
    encrypted = fernet.encrypt(json.dumps(data).encode())
    path = state_file()
    tmp = path.with_suffix(".tmp")
    tmp.write_bytes(encrypted)
    os.replace(tmp, path)


def load_dkg_secrets(fernet: Fernet, completed_dkgs: dict[str, DkgEntry], logger: logging.Logger) -> None:
    path = state_file()
    if not path.exists():
        return
    try:
        data = json.loads(fernet.decrypt(path.read_bytes()))
        for pid, raw in data.items():
            completed_dkgs[pid] = _entry_from_raw(raw)
        logger.info("op=load_dkg_secrets status=ok proposals=%d", len(data))
    except InvalidToken:
        logger.error(
            "op=load_dkg_secrets status=error reason=decryption_failed "
            "(wrong KEYPER_PRIVATE_KEY or tampered file — starting with empty state)"
        )
    except Exception as err:
        logger.error("op=load_dkg_secrets status=error err=%s", err)


def prune_expired_dkg_secrets(
    fernet: Fernet,
    completed_dkgs: dict[str, DkgEntry],
    logger: logging.Logger,
) -> list[str]:
    now = time.time()
    expired = [
        pid
        for pid, entry in completed_dkgs.items()
        if entry.expires_at is not None and entry.expires_at <= now
    ]
    if not expired:
        return []
    for pid in expired:
        del completed_dkgs[pid]
    save_dkg_secrets(fernet, completed_dkgs)
    logger.info("op=prune_dkg_secrets status=ok removed=%d proposals=%s", len(expired), expired)
    return expired


def start_prune_loop(
    completed_dkgs: dict[str, DkgEntry],
    fernet: Fernet,
    logger: logging.Logger,
    lock: threading.Lock,
) -> None:
    retention_s = retention_time()
    interval = prune_interval_s()
    if retention_s <= 0 or interval <= 0:
        logger.info(
            "op=prune_dkg_secrets status=disabled retention_time_s=%.0f interval_s=%.0f",
            retention_s,
            interval,
        )
        return

    def _loop() -> None:
        while True:
            time.sleep(interval)
            try:
                with lock:
                    prune_expired_dkg_secrets(fernet, completed_dkgs, logger)
            except Exception as err:
                logger.error("op=prune_dkg_secrets status=error err=%s", err)

    thread = threading.Thread(target=_loop, name="dkg-prune", daemon=True)
    thread.start()
    logger.info(
        "op=prune_dkg_secrets status=started interval_s=%.0f retention_time_s=%.0f",
        interval,
        retention_s,
    )
