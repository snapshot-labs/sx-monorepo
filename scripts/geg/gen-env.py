#!/usr/bin/env python3
"""Generate one coherent set of private-voting identities.

Four processes share a handful of identities, and almost every way the stack fails
to start is the same mistake: an identity written in two places that no longer agree.
The committee addresses in `TE_KEYPERS` are derived from the keyper private keys;
`COORDINATOR_IDENTITY` (pinned by every keyper) and `TE_RESULT_PUBLISHER_ADDRESS`
(frozen into every proposal) are both the coordinator's address. Written by hand,
any of those can drift, and the symptom is an authorisation failure that names
neither side of the mismatch.

So this derives every address from the key that owns it, and writes all the files
at once — all of them in this repo, since the coordinator and the keypers now run
the published protocol image and need no checkout of their own:

    .env              hub, sequencer, and the coordinator (one compose project)
    .env.keyper1..N   one per committee member

**Existing keys are reused.** Re-running is how you repair a drifted file: keys are
read back out of whatever is already on disk and only the derived values are
recomputed. Pass `--rotate` to mint new ones — that is a destructive act, since a
keyper that changes its key loses its committee membership and its ability to
finish any election it already holds a share for.

    python3 scripts/geg/gen-env.py
    python3 scripts/geg/gen-env.py --write
    python3 scripts/geg/gen-env.py --rotate --write

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

# The keypers are separate compose projects with no shared network, so their URLs go
# through the host. localhost would resolve to the calling container itself.
DEFAULT_DATA_LAYER_URL = "http://host.docker.internal:3002"
# The coordinator shares docker-compose.yml's network with the translator, so it
# addresses it by service name — no host round-trip, and no dependency on the
# translator's port being published.
DEFAULT_COORDINATOR_DATA_LAYER_URL = "http://te-data-layer:3002"
DEFAULT_COORDINATOR_URL = "http://host.docker.internal:8400"
DEFAULT_KEYPER_HOST = "host.docker.internal"


def derive_addresses(keys: list[str]) -> list[str]:
    """The Ethereum address for each private key.

    This used to import `eth_account` from the protocol repo's virtualenv, which made
    a Snapshot-side tool depend on a checkout of another repository even though every
    file it writes lives here. The monorepo already vendors `@ethersproject/wallet` —
    the same library the sequencer uses to recover signers — so the derivation now
    agrees with the sequencer by construction and needs nothing outside this repo.

    Keys go over stdin, not argv: argv is world-readable in `ps`.
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
    ap.add_argument("--keypers", type=int, default=3, metavar="N",
                    help="committee size (default 3)")
    ap.add_argument("--sx-env", default=str(REPO_ROOT / ".env"),
                    help="Snapshot-side env file to write (default .env)")
    ap.add_argument("--data-layer-url", default=DEFAULT_DATA_LAYER_URL,
                    help="how the keypers reach the translator (through the host)")
    ap.add_argument("--coordinator-data-layer-url",
                    default=DEFAULT_COORDINATOR_DATA_LAYER_URL,
                    help="how the coordinator reaches the translator (same network)")
    ap.add_argument("--coordinator-url", default=DEFAULT_COORDINATOR_URL,
                    help="how the keypers reach the coordinator's write relay")
    ap.add_argument("--keyper-host", default=DEFAULT_KEYPER_HOST,
                    help="host in the keyper URLs the coordinator dials")
    args = ap.parse_args()

    sx_path = Path(args.sx_env)
    keyper_paths = [REPO_ROOT / f".env.keyper{i}" for i in range(1, args.keypers + 1)]

    sx_env = parse_env_file(sx_path)
    keyper_envs = [parse_env_file(p) for p in keyper_paths]
    # Where the coordinator's own settings used to live, before it became a service
    # in docker-compose.yml. Still read so an existing deployment keeps its key.
    coordinator_env = parse_env_file(REPO_ROOT / ".env.coordinator")

    reused: list[str] = []
    displaced: list[str] = []

    def key(label: str, *candidates: str) -> str:
        """An existing key from the first place it appears, or a fresh one.

        The candidates are searched in order so a file written by an earlier layout
        of this script still yields its keys — rotating an identity by accident is
        precisely the failure this tool exists to prevent.
        """
        if not args.rotate:
            found = [v for v in candidates if HEX32.fullmatch(v or "")]
            if found:
                # More than one file claims this identity and they disagree. The
                # first candidate wins — for the coordinator that is `.env`, the file
                # compose actually reads — but say so, because the losing value is
                # one somebody deliberately wrote somewhere.
                if len({normalize_key(v) for v in found}) > 1:
                    displaced.append(label)
                reused.append(label)
                return normalize_key(found[0])
        return "0x" + secrets.token_hex(32)

    def carry(name: str, mint=None) -> str:
        """Preserve a value this script does not own.

        `.env` is a single file holding both the committee (generated here) and
        Snapshot's own secrets (written by a human). Rewriting the file wholesale
        would silently drop the latter, so they are read back and re-emitted.

        Never rotated, even under `--rotate`: `--rotate` means "new committee", and
        taking the sequencer's relayer key with it would invalidate every receipt it
        has ever signed for reasons the operator never asked for.
        """
        existing = sx_env.get(name, "").strip()
        if existing:
            return existing
        return mint() if mint else ""

    # The coordinator: drives the ceremony and the tally, and signs the result.
    # Rotating it alone is safe for the committee but not free: every keyper pins the
    # address as its sole bootstrapper, so all of their env files must be rewritten
    # too — which is exactly what this script does next.
    coordinator_sk = (
        "0x" + secrets.token_hex(32)
        if args.rotate_coordinator
        else key(
            "coordinator",
            # `.env` first: the coordinator is a service in docker-compose.yml and
            # reads its settings from there. A `.env.coordinator` is a leftover from
            # the layout that ran it out of the protocol repo, and must not outrank
            # the live file — it would rewrite the result-publisher identity out from
            # under every proposal already frozen against it.
            sx_env.get("COORDINATOR_SIGNING_KEY", ""),
            coordinator_env.get("COORDINATOR_SIGNING_KEY", ""),
        )
    )
    (coordinator_addr,) = derive_addresses([coordinator_sk])
    api_token = (
        secrets.token_hex(32)
        if (args.rotate or args.rotate_coordinator)
        else (
            sx_env.get("COORDINATOR_API_TOKEN")
            or coordinator_env.get("COORDINATOR_API_TOKEN")
            or secrets.token_hex(32)
        )
    )

    # The committee. Each key belongs to one operator and, in a real deployment,
    # never leaves that operator's machine — they are generated together here only
    # because one machine is running all of them.
    keyper_sks = [
        key(
            f"keyper{i}",
            keyper_envs[i - 1].get("KEYPER_SIGNING_KEY", ""),
            sx_env.get(f"GEG_KEYPER_PRIVATE_KEY_{i}", ""),
        )
        for i in range(1, args.keypers + 1)
    ]
    keyper_addrs = derive_addresses(keyper_sks)
    keyper_ports = [
        int(keyper_envs[i - 1].get("KEYPER_PORT") or 8100 + i)
        for i in range(1, args.keypers + 1)
    ]
    # The state directory holds this keyper's encrypted shares. Repointing it would
    # silently strand every election it is a member of, so an existing value wins.
    keyper_state_dirs = [
        keyper_envs[i - 1].get("KEYPER_STATE_DIR_HOST") or f"./keyper-state{i}"
        for i in range(1, args.keypers + 1)
    ]

    # URLs only. The sequencer reads each keyper's signing address from its own
    # /status when it freezes a committee onto a proposal, and refuses two URLs that
    # report the same address. A second copy of the address here would only be
    # somewhere for it to go stale when an operator rotates their key.
    te_keypers = ",".join(
        f"http://{args.keyper_host}:{port}" for port in keyper_ports
    )

    # The quorum the protocol requires: a strict majority of the committee.
    quorum = args.keypers // 2 + 1

    # The eligibility issuer signs on G1; any 32-byte scalar works as its secret.
    eligibility_sk = key("eligibility", sx_env.get("TE_ELIGIBILITY_PRIVATE_KEY", ""))
    seq_relayer = carry("SEQ_RELAYER_PK", lambda: "0x" + secrets.token_hex(32))
    # Hardware-dependent and set deliberately by the operator, so it is carried like
    # a secret rather than regenerated. Omitting it used to drop it on every re-run,
    # silently reverting a tuned deployment to the compose default.
    solver_ceiling = carry("TE_SOLVER_CEILING") or "1e12"
    auth_secret = carry("SEQ_AUTH_SECRET", lambda: secrets.token_hex(32))
    wc_project = carry("WALLETCONNECT_PROJECT_ID") or "<your_walletconnect_project_id>"

    coordinator_data_layer_url = args.coordinator_data_layer_url
    sx_body = f"""\
# Snapshot-side environment. Compose reads this file and docker-compose.yml by
# default, so `docker compose up -d` needs no flags.
#
# ONE file. The committee section below is generated by scripts/geg/gen-env.py,
# together with the .env.keyperN files beside it -- every address here is derived
# from the key that owns it. Do not edit an address by hand; change the key it comes
# from and re-run.
#
# Snapshot's own secrets are carried through untouched on re-runs, so this stays a
# single file rather than two that a reader has to merge in their head. An earlier
# layout split them across two files passed to docker compose together; load order
# decided which duplicate won, and a stale TE_THRESHOLD_T sat in the losing file for
# weeks looking authoritative.
#
# SECRETS. Never commit this file.

# --- Snapshot services -------------------------------------------------------
# Signs sequencer receipts. Not a funded wallet; a throwaway is fine locally.
SEQ_RELAYER_PK={seq_relayer}
SEQ_AUTH_SECRET={auth_secret}
WALLETCONNECT_PROJECT_ID={wc_project}

# --- committee --------------------------------------------------------------
# The committee, as URLs. The sequencer resolves each keyper's signing address from
# its /status when it freezes a committee onto a proposal, the same way the
# protocol's own admin UI assembles one -- and refuses two URLs that answer with the
# same address, since that would make the threshold smaller than it looks.
#
# The URLs are dialled by the *coordinator* and the sequencer from inside their
# containers -- which is why they are host.docker.internal and not localhost.
TE_KEYPERS={te_keypers}
# The quorum: t of n keypers act together. Must be a strict majority (2t > n).
TE_THRESHOLD_T={quorum}
# Denominator for weighted vote splits: 100 means percentages.
TE_WEIGHTED_BUDGET=100

# --- the coordinator ---------------------------------------------------------
# Part of `docker compose up -d`, and fail-closed: without the two values below,
# compose refuses to start anything. Its key has three
# names across this deployment and they must all be the same address: the key here,
# TE_RESULT_PUBLISHER_ADDRESS below, and COORDINATOR_IDENTITY in every .env.keyperN.
# All three are derived from this one key, which is the point of this script.
COORDINATOR_SIGNING_KEY={coordinator_sk}

# Bearer token the keypers present when relaying writes. The coordinator pushes each
# keyper its own token over the sealed /auth/bootstrap channel, so this never gets
# copied into a keyper env. Fail-closed: unset and the coordinator will not start.
COORDINATOR_API_TOKEN={api_token}

# The translator, over the compose network this service shares with it.
GEG_DATA_LAYER_URL={coordinator_data_layer_url}
COORDINATOR_PORT=8400
# Seconds between data-layer polls. This is also the stall timeout, because the
# attempt budget counts polls: 5 consecutive polls with no keyper working abandons
# the tally, so 30 gives ~150s of tolerance for an unreachable keyper where 2.0 gave
# ~10s -- short enough that a rolling restart stalled every election in its tally
# window. Ceiling is MIN_DKG_LEAD_TIME_S: a registered election waits up to one poll
# before its ceremony starts, and the key must exist by votingStart.
COORDINATOR_POLL_S=30

# --- result publisher --------------------------------------------------------
# The address of COORDINATOR_SIGNING_KEY above, frozen into every proposal. The hub
# accepts a published result from no other key.
TE_RESULT_PUBLISHER_ADDRESS={coordinator_addr}

# --- eligibility ------------------------------------------------------------
# The hub signs one credential per ballot binding that ballot's voting power. The
# public half is frozen into each proposal, so rotating this key makes every
# credential on every existing proposal fail to verify -- and the tally of any
# affected proposal reads as all zeros.
TE_ELIGIBILITY_PRIVATE_KEY={eligibility_sk}

# --- proposal gating --------------------------------------------------------
# A private proposal must open at least this far ahead, or the key ceremony cannot
# finish in time and the proposal is terminally failed the moment voting opens.
MIN_DKG_LEAD_TIME_S=180

# How large a discrete-log search the coordinator can solve: budget x sum(admitted
# weights). It decides every proposal's `scale`, so it is a statement about the
# coordinator's hardware, not a preference -- see .env.example for the RAM table.
TE_SOLVER_CEILING={solver_ceiling}
"""

    keyper_bodies = []
    for i, (sk, port, state_dir) in enumerate(
        zip(keyper_sks, keyper_ports, keyper_state_dirs), start=1
    ):
        keyper_bodies.append(f"""\
# Keyper {i} env, for docker-compose.keyper.yml (this repo).
#
# Generated by the Snapshot repo's scripts/geg/gen-env.py. This key's address is
# frozen into every proposal's committee list (TE_KEYPERS on the Snapshot side), so
# changing it drops this keyper out of the committee -- including for elections it
# already holds a share for.
#
# In a real deployment this file lives only on this operator's machine, and the
# operator generates the key themselves; all {len(keyper_sks)} are written here because one
# machine is running the whole committee.
#
# SECRETS. Never commit this file.

#   docker compose -p keyper{i} -f docker-compose.keyper.yml \\
#     --env-file .env.keyper{i} up -d

KEYPER_SIGNING_KEY={sk}

# The coordinator's address, pinned: no other identity may bootstrap this keyper.
COORDINATOR_IDENTITY={coordinator_addr}

# Reads: Snapshot's translator. Base URL only -- the keyper appends the port read
# surface (/port) itself.
GEG_API_URL={args.data_layer_url}
# Writes: relayed through the coordinator, which is the only writer to the data layer.
COORDINATOR_URL={args.coordinator_url}

# Listen + published port. MUST match this keyper's endpoint in TE_KEYPERS.
KEYPER_PORT={port}

# Its own state directory, or the committee members overwrite each other's shares.
KEYPER_STATE_DIR_HOST={state_dir}

# Seconds past voting_end that this keyper keeps its share. There is no tally
# deadline, so this is the only bound on how late a tally can still decrypt.
KEYPER_SECRET_TTL_S=7776000
""")

    plan = [(sx_path, sx_body)]
    plan += list(zip(keyper_paths, keyper_bodies))

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
    for i, (addr, port) in enumerate(zip(keyper_addrs, keyper_ports), start=1):
        print(f"  keyper {i}     {addr}  :{port}", file=sys.stderr)
    if args.rotate:
        print("\n  every key was rotated: any election already in flight is orphaned",
              file=sys.stderr)
    elif reused:
        print(f"\n  reused existing keys: {', '.join(sorted(set(reused)))}",
              file=sys.stderr)
    if displaced and not args.rotate:
        print(
            f"  WARNING: two files disagreed about {', '.join(sorted(set(displaced)))}"
            " -- kept the value in .env, which is the one compose reads.\n"
            "           If the other one is the live identity, any proposal already"
            " frozen against it can no longer be tallied.",
            file=sys.stderr,
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
