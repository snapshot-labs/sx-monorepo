#!/usr/bin/env python3
"""Write `.env` for docker-compose.yml with every address derived from its key.

The coordinator's address appears as `TE_RESULT_PUBLISHER_ADDRESS` here and as
`COORDINATOR_IDENTITY` in every keyper's env. Written by hand they drift, and the
result is an authorisation failure that names neither side. This script derives the
address from `COORDINATOR_SIGNING_KEY` instead.

It owns no keyper material: keypers are run by other operators, and `TE_KEYPERS`
(their URLs) is carried over from the existing `.env`.

Existing keys are reused, so re-running repairs a file edited by mistake. `--rotate`
mints new keys, which breaks every election in flight: the coordinator's address is
pinned by every keyper and frozen into every proposal already created.

    python3 scripts/sgp/gen-env.py
    python3 scripts/sgp/gen-env.py --write
    python3 scripts/sgp/gen-env.py --rotate --write

Nothing is written without `--write`; the default prints the plan, with the derived
addresses but not the secrets. The written files contain secrets, are chmod 600, and
are gitignored.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import secrets
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[1]

# Written with or without the 0x by different generators; both are the same key.
HEX32 = re.compile(r"(0x)?[0-9a-fA-F]{64}")


def normalize_key(value: str) -> str:
    return value if value.startswith("0x") else "0x" + value

# The coordinator shares the compose network with the translator.
DEFAULT_COORDINATOR_DATA_LAYER_URL = "http://te-data-layer:3002"


def derive_addresses(keys: list[str]) -> list[str]:
    """The Ethereum address for each private key.

    Uses `@ethersproject/wallet`, the library the sequencer recovers signers with, so
    both agree. Keys go over stdin, not argv, because argv is visible in `ps`.
    """
    script = (
        'const {Wallet} = require("@ethersproject/wallet");\n'
        'const keys = JSON.parse(await Bun.stdin.text());\n'
        'process.stdout.write(keys.map(k => new Wallet(k).address).join("\\n"));\n'
    )
    # Run from a workspace that resolves the dependency, not the monorepo root.
    cwd = REPO_ROOT / "apps" / "sequencer"
    try:
        proc = subprocess.run(
            ["bun", "-e", script], cwd=cwd, input=json.dumps(keys),
            capture_output=True, text=True,
        )
    except FileNotFoundError:
        print("FAIL: `bun` not found — it derives the addresses (bun.sh)",
              file=sys.stderr)
        raise SystemExit(2)
    if proc.returncode != 0:
        print(f"FAIL: address derivation failed:\n{proc.stderr.strip()}",
              file=sys.stderr)
        raise SystemExit(2)
    out = proc.stdout.strip().splitlines()
    if len(out) != len(keys):
        print(f"FAIL: expected {len(keys)} addresses, got {len(out)}", file=sys.stderr)
        raise SystemExit(2)
    return out


def parse_env_file(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.exists():
        return out
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip()
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true",
                    help="write the files (default: print the plan only)")
    ap.add_argument("--rotate", action="store_true",
                    help="mint new keys instead of reusing what is on disk (destructive)")
    ap.add_argument("--rotate-coordinator", action="store_true",
                    help="mint a new coordinator key only, keeping the committee intact")
    ap.add_argument("--sx-env", default=str(REPO_ROOT / ".env"),
                    help="Snapshot-side env file to write (default .env)")
    ap.add_argument("--coordinator-data-layer-url",
                    default=DEFAULT_COORDINATOR_DATA_LAYER_URL,
                    help="how the coordinator reaches the translator (same network)")
    args = ap.parse_args()

    sx_path = Path(args.sx_env)
    sx_env = parse_env_file(sx_path)

    reused: list[str] = []

    def key(label: str, existing: str) -> str:
        """The existing key, or a fresh one under `--rotate` or when there is none."""
        if not args.rotate and HEX32.fullmatch(existing or ""):
            reused.append(label)
            return normalize_key(existing)
        return "0x" + secrets.token_hex(32)

    def carry(name: str, mint=None, valid=None) -> str:
        """A value this script does not own, kept from the existing `.env`.

        Never rotated, even under `--rotate`: rotating the sequencer's relayer key
        would invalidate every receipt it has signed. A value that fails `valid`,
        such as the `0x...` placeholder from `.env.example`, is replaced.
        """
        existing = sx_env.get(name, "").strip()
        if existing and (valid is None or valid(existing)):
            return existing
        return mint() if mint else ""

    # Rotating the coordinator alone keeps the committee, but every keyper pins its
    # address as COORDINATOR_IDENTITY, so each operator must update their env.
    coordinator_sk = (
        "0x" + secrets.token_hex(32)
        if args.rotate_coordinator
        else key("coordinator", sx_env.get("COORDINATOR_SIGNING_KEY", ""))
    )
    (coordinator_addr,) = derive_addresses([coordinator_sk])
    api_token = (
        secrets.token_hex(32)
        if (args.rotate or args.rotate_coordinator)
        else (sx_env.get("COORDINATOR_API_TOKEN") or secrets.token_hex(32))
    )


    # The eligibility issuer signs on G1; any 32-byte scalar works as its secret.
    eligibility_sk = key("eligibility", sx_env.get("TE_ELIGIBILITY_PRIVATE_KEY", ""))
    seq_relayer = carry(
        "SEQ_RELAYER_PK", lambda: "0x" + secrets.token_hex(32), valid=HEX32.fullmatch
    )
    # Set by the operator to match the coordinator's hardware, so kept on a re-run.
    solver_ceiling = carry("TE_SOLVER_CEILING") or "1e12"
    # Received from the keyper operators, not minted here.
    te_keypers = carry("TE_KEYPERS") or "https://keyper1.example,https://keyper2.example,https://keyper3.example"
    quorum = carry("TE_THRESHOLD_T") or "2"
    auth_secret = carry("SEQ_AUTH_SECRET", lambda: secrets.token_hex(32))
    wc_project = carry("WALLETCONNECT_PROJECT_ID") or "<your_walletconnect_project_id>"
    # Tuned by operators, so kept on a re-run rather than reset to the default.
    weighted_budget = carry("TE_WEIGHTED_BUDGET") or "100"
    coordinator_port = carry("COORDINATOR_PORT") or "8400"
    poll_s = carry("COORDINATOR_POLL_S") or "30"
    min_lead_s = carry("MIN_DKG_LEAD_TIME_S") or "180"

    coordinator_data_layer_url = args.coordinator_data_layer_url
    sx_body = f"""\
# Environment for docker-compose.yml, generated by scripts/sgp/gen-env.py.
# Addresses are derived from their keys: change the key and re-run instead of
# editing an address. Values the script does not own are kept on a re-run.
# Variable meanings: .env.example.
#
# SECRETS. Never commit this file.

# --- Snapshot services -------------------------------------------------------
# Signs sequencer receipts. Not a funded wallet; a throwaway is fine locally.
SEQ_RELAYER_PK={seq_relayer}
SEQ_AUTH_SECRET={auth_secret}
WALLETCONNECT_PROJECT_ID={wc_project}

# --- committee --------------------------------------------------------------
# One URL per keyper, from its operator. Dialled from inside the containers, so on
# one machine use host.docker.internal, not localhost.
TE_KEYPERS={te_keypers}
# The quorum: t of n keypers act together. Must be a strict majority (2t > n).
TE_THRESHOLD_T={quorum}
# Denominator for weighted vote splits: 100 means percentages.
TE_WEIGHTED_BUDGET={weighted_budget}

# --- the coordinator ---------------------------------------------------------
# Required: without the two values below, compose starts no service. Its address is
# TE_RESULT_PUBLISHER_ADDRESS below and COORDINATOR_IDENTITY in every keyper's env.
COORDINATOR_SIGNING_KEY={coordinator_sk}

# Secret for the keypers' write relay; never copied into a keyper's env.
COORDINATOR_API_TOKEN={api_token}

# The translator, over the compose network this service shares with it.
SHUTTER_GOVERNANCE_PROTOCOL_DATA_LAYER_URL={coordinator_data_layer_url}
COORDINATOR_PORT={coordinator_port}
# Seconds between polls. A tally stalls after 5 polls with no keyper working, so 30
# tolerates an unreachable keyper for ~150 s. Keep it below MIN_DKG_LEAD_TIME_S: a
# new election can wait one poll before its key ceremony starts.
COORDINATOR_POLL_S={poll_s}

# --- result publisher --------------------------------------------------------
# The address of COORDINATOR_SIGNING_KEY, frozen into every proposal.
TE_RESULT_PUBLISHER_ADDRESS={coordinator_addr}

# --- eligibility ------------------------------------------------------------
# The sequencer signs each voter's credential with this key. Rotating it invalidates
# the credentials on existing proposals, and their tallies read as all zeros.
TE_ELIGIBILITY_PRIVATE_KEY={eligibility_sk}

# --- proposal gating --------------------------------------------------------
# A private proposal must open at least this far ahead, so its key ceremony can
# finish before voting starts.
MIN_DKG_LEAD_TIME_S={min_lead_s}

# The largest tally search the coordinator can solve; sets each proposal's `scale`.
# Size it to the coordinator's RAM: docs/private-voting/README.md ("Coordinator sizing").
TE_SOLVER_CEILING={solver_ceiling}
"""

    # Keep every other variable from the old file (SEQUENCER_PUBLIC_URL, image tags,
    # port overrides...) after the ones written above.
    owned = {line.split("=", 1)[0] for line in sx_body.splitlines()
             if line and not line.startswith("#") and "=" in line}
    kept = [(k, v) for k, v in sx_env.items() if k not in owned]
    if kept:
        sx_body += (
            "\n# --- kept from the previous file (not managed by this script) ---\n"
            + "".join(f"{k}={v}\n" for k, v in kept)
        )

    plan = [(sx_path, sx_body)]

    if args.write:
        for path, body in plan:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(body)
            path.chmod(0o600)
            print(f"wrote {path} (mode 600)", file=sys.stderr)
    else:
        for path, _ in plan:
            state = "overwrite" if path.exists() else "create"
            print(f"would {state} {path}", file=sys.stderr)
        print("\n(nothing written; pass --write)", file=sys.stderr)

    print("", file=sys.stderr)
    print(f"  coordinator  {coordinator_addr}", file=sys.stderr)
    if args.rotate:
        print("\n  every key was rotated: any election already in flight is orphaned",
              file=sys.stderr)
    elif reused:
        print(f"\n  reused existing keys: {', '.join(sorted(set(reused)))}",
              file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
