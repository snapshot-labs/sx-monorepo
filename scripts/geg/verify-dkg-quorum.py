#!/usr/bin/env python3
"""Live gate: the DKG write path, signed by geg and finalised at quorum.

Submits DKG results through the running translator using geg's *own* signing code,
and asserts the hub behaves exactly as the protocol's port requires:

  * a submission from a non-member is refused (403)
  * a member's submission is accepted but does not finalise below quorum
  * re-submitting identical values is idempotent
  * a member changing its mind is a conflict (409), not a silent overwrite
  * the key publishes at t+1 byte-identical submissions, and not before
  * a divergent submission never reaches quorum

The signatures are produced by `geg.core.write_auth.sign_dkg_result`, so this also
proves the hub's TypeScript digest reconstruction agrees with the Python one over
the wire rather than only against a checked-in vector.

Usage, with the stack up and a proposal whose te_mpk is NULL:

    python3 scripts/geg/verify-dkg-quorum.py <proposal-id> <keys.json> [geg-repo]

    The geg checkout is required — pass it as the last argument or set GEG_REPO.

`keys.json` is `{"keys": [...secp256k1 hex...], "addresses": [...]}` for the
committee named in that proposal's config, in committee order.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[1]

TE_DATA_LAYER_URL = os.environ.get("TE_DATA_LAYER_URL", "http://localhost:3002")

# Deterministic dummy DKG outputs. The values need only be well-formed points for
# this gate: what is under test is the write path, quorum rule and authorisation,
# not the ceremony that produced them.
PK_ELECTION = "0x" + "a1" * 96
COMMITTEE = ["0x" + h * 96 for h in ("b1", "b2", "b3")]
DIVERGENT_PK = "0x" + "c9" * 96

results: list[tuple[bool, str]] = []


def resolve_geg_repo(explicit: str | None) -> Path:
    """The generalised-el-gamal checkout to run against.

    Explicit argument first, then GEG_REPO. There is deliberately no default:
    this is a cross-repo dev tool and the checkout lives wherever the person
    running it put it. Guessing a sibling path only converts "you did not say
    where geg is" into a confusing failure several steps later.
    """
    raw = explicit or os.environ.get("GEG_REPO")
    if not raw:
        print(
            "FAIL: no generalised-el-gamal checkout given.\n"
            "      pass its path as an argument, or set "
            "GEG_REPO=/path/to/generalised-el-gamal",
            file=sys.stderr,
        )
        raise SystemExit(2)
    return Path(raw).expanduser().resolve()


def check(ok: bool, label: str) -> None:
    results.append((ok, label))
    print(f"  [{'ok' if ok else 'FAIL'}] {label}")


def post(eid: str, payload: dict) -> int:
    req = urllib.request.Request(
        f"{TE_DATA_LAYER_URL}/elections/{eid}/dkg",
        data=json.dumps(payload).encode(),
        headers={"content-type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def get(path: str):
    with urllib.request.urlopen(f"{TE_DATA_LAYER_URL}{path}", timeout=30) as r:
        return json.load(r)


def run(proposal_id: str, keys_path: str) -> int:
    from geg.core.write_auth import sign_dkg_result

    eid_hex = proposal_id[2:] if proposal_id.startswith("0x") else proposal_id
    election_id = bytes.fromhex(eid_hex)
    committee = json.load(open(keys_path))
    keys = [int(k, 16) for k in committee["keys"]]

    def sig(sk: int, pk: str = PK_ELECTION, cpks: list[str] | None = None) -> str:
        cpks = cpks if cpks is not None else COMMITTEE
        return "0x" + sign_dkg_result(
            sk, election_id,
            bytes.fromhex(pk[2:]),
            [bytes.fromhex(c[2:]) for c in cpks],
        ).hex()

    body = lambda s, pk=PK_ELECTION, cpks=None: {  # noqa: E731
        "pkElection": pk,
        "committeePKs": cpks if cpks is not None else COMMITTEE,
        "keyperSig": s,
    }

    print(f"DKG write path for {proposal_id[:18]}… via {TE_DATA_LAYER_URL}")

    if get(f"/elections/{eid_hex}")["finalizedKey"] is not None:
        print("FAIL: proposal already has a finalized key; reseed with te_mpk NULL",
              file=sys.stderr)
        return 1

    # An outsider holding a valid signature over valid content is still not a member.
    outsider = 0xDEAD00000000000000000000000000000000000000000000000000000000BEEF
    check(post(eid_hex, body(sig(outsider))) == 403,
          "a non-member submission is refused with 403")

    # One member: recorded, but a single submission is not a quorum at t=1.
    check(post(eid_hex, body(sig(keys[0]))) == 204,
          "keyper 1 submission accepted (204)")
    check(get(f"/elections/{eid_hex}")["finalizedKey"] is None,
          "no key published below quorum")
    check(len(get(f"/elections/{eid_hex}/dkg")["submissions"]) == 1,
          "the submission is readable back")

    # Replays happen on retry; they must not be conflicts.
    check(post(eid_hex, body(sig(keys[0]))) == 204,
          "an identical re-submission is idempotent (204)")
    check(len(get(f"/elections/{eid_hex}/dkg")["submissions"]) == 1,
          "the replay did not create a second row")

    # A member signing different content for the same election is evidence, not a race.
    check(post(eid_hex, body(sig(keys[0], DIVERGENT_PK), DIVERGENT_PK)) == 409,
          "a keyper changing its result is a 409 conflict")

    # Second member agreeing reaches t+1 = 2.
    check(post(eid_hex, body(sig(keys[1]))) == 204,
          "keyper 2 submission accepted (204)")
    record = get(f"/elections/{eid_hex}")
    fk = record["finalizedKey"]
    check(fk is not None, "key published at t+1 matching submissions")
    if fk is not None:
        check(fk["pkElection"].lower() == PK_ELECTION.lower(),
              "the published key is the one the quorum agreed on")
        check([c.lower() for c in fk["committeePKs"]] == [c.lower() for c in COMMITTEE],
              "the published committee keys match the quorum")

    # The finalized read must agree with the election read.
    check(get(f"/elections/{eid_hex}/dkg/finalized")["finalizedKey"] == fk,
          "the finalized-key route agrees with the election record")

    # A third member may still submit; the record stays complete.
    check(post(eid_hex, body(sig(keys[2]))) == 204,
          "a post-finalisation submission is still recorded")
    check(len(get(f"/elections/{eid_hex}/dkg")["submissions"]) == 3,
          "all three submissions are retained for audit")

    failed = [label for ok, label in results if not ok]
    print()
    if failed:
        print(f"FAIL: {len(failed)}/{len(results)} checks failed", file=sys.stderr)
        for label in failed:
            print(f"  - {label}", file=sys.stderr)
        return 1
    print(f"PASS: all {len(results)} DKG write-path checks hold")
    return 0


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__, file=sys.stderr)
        return 2
    proposal_id, keys_path = sys.argv[1], sys.argv[2]
    geg_repo = resolve_geg_repo(sys.argv[3] if len(sys.argv) > 3 else None)

    if os.environ.get("_GEG_REEXEC") != "1":
        venv_python = geg_repo / ".venv" / "bin" / "python"
        if not venv_python.exists():
            print(f"FAIL: no geg venv at {venv_python}", file=sys.stderr)
            return 2
        env = {**os.environ, "_GEG_REEXEC": "1"}
        return subprocess.call(
            [str(venv_python), str(Path(__file__).resolve()),
             proposal_id, keys_path, str(geg_repo)],
            env=env,
        )
    return run(proposal_id, keys_path)


if __name__ == "__main__":
    sys.exit(main())
