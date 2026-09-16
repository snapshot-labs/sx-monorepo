#!/usr/bin/env python3
"""Live gate: geg must reproduce the legacy aggregate byte-for-byte.

This is the acceptance test for the read path. It runs geg's real client against a
running translator, decodes what the hub serves, applies geg's admission kernel,
recomputes the voting-power-weighted homomorphic aggregate, and compares it to the
aggregate the **legacy sequencer already computed and stored** for the same
proposal.

Byte equality is the requirement, not arithmetic equality. Under the target design
an aggregate becomes canonical only at a t+1 *byte-identical* keyper quorum, so two
implementations that agree mathematically but serialise differently would never
reach quorum and every tally would stall.

What this exercises, end to end and with no stubs:

    geg HttpDataLayerClient
      -> translator  (id translation, status mapping)
      -> hub         (config composition, credential minting, ballot ordering)
      -> MySQL       (the real proposal and its real ballots)
    -> geg dec_config / dec_ballot   (the wire format)
    -> geg verify_attestation        (the credentials hub minted)
    -> geg admit                     (proof + signature + duplicate policy)
    -> geg aggregate_points          (weighted homomorphic sum)
    == proposals.te_aggregate        (what the legacy TypeScript produced)

Usage, with the stack up and a proposal that has both te_geg_config and a stored
te_aggregate:

    python3 scripts/geg/verify-aggregate-parity.py <proposal-id> [geg-repo]

    The geg checkout is required — pass it as the last argument or set GEG_REPO.

Environment:
    TE_DATA_LAYER_URL   translator base url (default http://localhost:3002)
    HUB_URL             hub base url, for reading the stored aggregate
                        (default http://localhost:3000)
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[1]

TE_DATA_LAYER_URL = os.environ.get("TE_DATA_LAYER_URL", "http://localhost:3002")
HUB_URL = os.environ.get("HUB_URL", "http://localhost:3000")


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


def get_json(url: str):
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.load(r)


def run(proposal_id: str) -> int:
    from geg.adapters.db.client import HttpDataLayerClient
    from geg.core.admission import StoredBallot, admit
    from geg.core.aggregation import build_aggregate_artifact
    from geg.ports.eligibility import verify_attestation

    eid_hex = proposal_id[2:] if proposal_id.startswith("0x") else proposal_id
    election_id = bytes.fromhex(eid_hex)

    # geg's own client, unmodified — if the translator's contract were wrong in any
    # detail, this is where it would surface.
    dl = HttpDataLayerClient(TE_DATA_LAYER_URL)

    print(f"reading election {proposal_id[:18]}… through {TE_DATA_LAYER_URL}")
    record = dl.get_election(election_id)
    config = record.config
    print(f"  config decoded: candidates={config.num_candidates} "
          f"budget={config.budget} mode={config.mode.value} "
          f"variant={config.variant.value} t={config.threshold.t} n={config.threshold.n}")
    print(f"  weighted={config.weighted} duplicatePolicy={config.duplicate_policy.value}")

    if record.finalized_key is None:
        print("FAIL: no finalized key on this election", file=sys.stderr)
        return 1
    mpk_bytes = record.finalized_key.pk_election

    count = dl.count_ballots(election_id)
    ballots = dl.list_ballots(election_id, 0, count)
    print(f"  ballots decoded: {len(ballots)} (count endpoint said {count})")
    if count != len(ballots):
        print("FAIL: count endpoint disagrees with the ballot list", file=sys.stderr)
        return 1
    if not ballots:
        print("FAIL: no ballots to aggregate", file=sys.stderr)
        return 1

    # The credentials the hub minted must verify under geg's normative check,
    # independently of admission — a failure here would silently exclude every
    # ballot and produce a tally of zeros.
    for i, env in enumerate(ballots):
        ok = verify_attestation(
            config.eligibility_key, env.attestation,
            election_id=election_id, max_weight=config.max_weight,
        )
        print(f"  ballot {i}: weight={env.attestation.weight} "
              f"nonce={env.attestation.nonce} attestation={'ok' if ok else 'FAIL'}")
        if not ok:
            print("FAIL: hub minted a credential geg rejects", file=sys.stderr)
            return 1

    # submitted_at is left None: the hub enforces the voting window at write time
    # (the sequencer rejects out-of-window votes), so the adapter has no
    # authoritative receive time to re-check here and the window check is skipped.
    stored = [StoredBallot(sequence_number=i, envelope=e, submitted_at=None)
              for i, e in enumerate(ballots)]

    admission = admit(stored, config, mpk_bytes)
    print(f"  admitted={list(a.sequence_number for a in admission.admitted)} "
          f"totalWeight={admission.total_admitted_weight}")
    for x in admission.exclusions:
        print(f"  excluded seq={x.sequence_number} reason={x.reason.value}")
    if not admission.admitted:
        print("FAIL: admission excluded every ballot", file=sys.stderr)
        return 1

    artifact = build_aggregate_artifact(config, admission)
    got = [(c.c1.hex(), c.c2.hex()) for c in artifact.aggregates]

    legacy = get_json(f"{HUB_URL}/api/proposal/{proposal_id}/te_aggregate")
    want = [(c["c1"][2:].lower(), c["c2"][2:].lower())
            for c in legacy["ciphertexts"]]

    print(f"\ncomparing {len(got)} aggregate ciphertexts against the stored legacy artifact")
    if len(got) != len(want):
        print(f"FAIL: geg produced {len(got)} ciphertexts, legacy stored {len(want)}",
              file=sys.stderr)
        return 1

    failures = 0
    for j, ((g1, g2), (w1, w2)) in enumerate(zip(got, want)):
        ok = g1 == w1 and g2 == w2
        if not ok:
            failures += 1
        print(f"  candidate {j}: {'ok' if ok else 'MISMATCH'}")
        if not ok:
            print(f"    geg    c1={g1[:32]}… c2={g2[:32]}…")
            print(f"    legacy c1={w1[:32]}… c2={w2[:32]}…")

    if failures:
        print(f"\nFAIL: {failures}/{len(got)} candidates differ", file=sys.stderr)
        return 1

    print(f"\nPASS: geg reproduced the legacy aggregate byte-for-byte "
          f"({len(got)} candidates, {len(admission.admitted)} admitted ballots, "
          f"total weight {admission.total_admitted_weight})")
    return 0


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__, file=sys.stderr)
        return 2
    proposal_id = sys.argv[1]
    geg_repo = resolve_geg_repo(sys.argv[2] if len(sys.argv) > 2 else None)

    if os.environ.get("_GEG_REEXEC") != "1":
        venv_python = geg_repo / ".venv" / "bin" / "python"
        if not venv_python.exists():
            print(f"FAIL: no geg venv at {venv_python}", file=sys.stderr)
            return 2
        env = {**os.environ, "_GEG_REEXEC": "1"}
        return subprocess.call(
            [str(venv_python), str(Path(__file__).resolve()), proposal_id, str(geg_repo)],
            env=env,
        )

    return run(proposal_id)


if __name__ == "__main__":
    sys.exit(main())
