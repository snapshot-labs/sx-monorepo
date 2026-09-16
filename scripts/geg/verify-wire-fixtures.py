#!/usr/bin/env python3
"""Cross-language gate: geg must accept the artifacts sx produces.

Two directions get proven separately.

`packages/geg-parity` covers TypeScript *verifying* geg's output, by replaying
geg's canonical vector corpus against the pinned crypto build. That runs in CI.

This script covers the reverse — geg *consuming* what sx emits — which is the
direction that actually runs in production:

  1. **Attestations.** The hub mints one eligibility credential per ballot; the
     keypers verify them. Checked with geg's normative `verify_attestation`.
  2. **Election configs.** The hub maps a Snapshot proposal onto the protocol's
     election config; every keyper and the coordinator decode it on every read.
     A single wrong enum value or key name makes all of them fail, so this runs
     the real `dec_config`.

It is a **dev-time** gate, not a CI gate: sx deliberately carries no Python
toolchain, so this is run by hand against a geg checkout whenever the wire-facing
code or a fixture changes, and after bumping the pinned geg version.

    # 1. regenerate the fixtures
    cd apps/hub
    WRITE_ATTESTATION_FIXTURE=1 npx jest test/unit/geg-attestation.test.ts
    WRITE_GEG_CONFIG_FIXTURE=1 npx jest test/unit/geg-config.test.ts

    # 2. verify them with geg (from the repo root)
    python3 scripts/geg/verify-wire-fixtures.py /path/to/generalised-el-gamal
    # ...or: GEG_REPO=/path/to/generalised-el-gamal python3 scripts/geg/verify-wire-fixtures.py

Exit code 0 means the two implementations agree. The fixtures are checked in, so
the last recorded result is always inspectable.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[1]
ATTESTATION_FIXTURE = (
    REPO_ROOT / "apps" / "hub" / "test" / "fixtures" / "ts-minted-attestations.json"
)
CONFIG_FIXTURE = REPO_ROOT / "apps" / "hub" / "test" / "fixtures" / "geg-configs.json"

REGEN_HINT = (
    "      regenerate it with:\n"
    "        cd apps/hub && \\\n"
    "        WRITE_ATTESTATION_FIXTURE=1 npx jest test/unit/geg-attestation.test.ts\n"
    "        cd apps/hub && \\\n"
    "        WRITE_GEG_CONFIG_FIXTURE=1 npx jest test/unit/geg-config.test.ts"
)


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


def unhex(s: str) -> bytes:
    return bytes.fromhex(s[2:] if s.startswith("0x") else s)


def check_attestations() -> tuple[int, int]:
    """geg's normative verify_attestation must accept every TS-minted credential."""
    from geg.envelopes.types import Attestation, AttestationScheme
    from geg.ports.eligibility import verify_attestation

    fixture = json.loads(ATTESTATION_FIXTURE.read_text())
    elig_key = unhex(fixture["eligibilityKey"])
    schemes = {
        "ATTESTATION_V1": AttestationScheme.V1,
        "ATTESTATION_LEGACY": AttestationScheme.LEGACY,
    }

    failures = 0
    print("attestations (geg verify_attestation):")
    for case in fixture["cases"]:
        attestation = Attestation(
            election_id=unhex(case["electionId"]),
            pseudonym=unhex(case["pseudonym"]),
            vk=unhex(case["vk"]),
            weight=int(case["weight"]),
            signature=unhex(case["signature"]),
            scheme=schemes[case["scheme"]],
            nonce=int(case["nonce"]),
        )
        got = verify_attestation(
            elig_key,
            attestation,
            election_id=unhex(case["electionId"]),
            max_weight=int(case["maxWeight"]),
        )
        want = bool(case["expected"]["verify"])
        if got != want:
            failures += 1
        print(f"  [{'ok' if got == want else 'FAIL'}] {case['name']}: "
              f"verify={got} (expected {want})")
    return failures, len(fixture["cases"])


def check_configs() -> tuple[int, int]:
    """geg's dec_config must decode every config the hub composes.

    Decoding is the whole test: dec_config raises on a wrong enum value, a wrong
    field type, or a missing key, and it is what every keyper and the coordinator
    run on every read. Round-tripping through enc_config additionally proves the
    decode was faithful rather than merely tolerant.
    """
    from geg.envelopes.codecs import dec_config, enc_config

    fixture = json.loads(CONFIG_FIXTURE.read_text())
    failures = 0
    print("\nelection configs (geg dec_config):")
    for case in fixture["cases"]:
        name = case["name"]
        try:
            config = dec_config(case["config"])
            roundtrip = enc_config(config)
            differing = sorted(
                k for k in case["config"]
                if json.dumps(roundtrip.get(k), sort_keys=True)
                != json.dumps(case["config"][k], sort_keys=True)
            )
            if differing:
                failures += 1
                print(f"  [FAIL] {name}: re-encode differs on {differing}")
                for k in differing:
                    print(f"           sx : {case['config'][k]!r}")
                    print(f"           geg: {roundtrip.get(k)!r}")
            else:
                print(f"  [ok] {name}: decoded, t={config.threshold.t} "
                      f"n={config.threshold.n} candidates={config.num_candidates} "
                      f"budget={config.budget}")
        except Exception as e:  # noqa: BLE001
            failures += 1
            print(f"  [FAIL] {name}: {type(e).__name__}: {e}")
    return failures, len(fixture["cases"])


def main() -> int:
    geg_repo = resolve_geg_repo(sys.argv[1] if len(sys.argv) > 1 else None)
    venv_python = geg_repo / ".venv" / "bin" / "python"

    missing = [p for p in (ATTESTATION_FIXTURE, CONFIG_FIXTURE) if not p.exists()]
    if missing:
        for p in missing:
            print(f"FAIL: no fixture at {p}", file=sys.stderr)
        print(REGEN_HINT, file=sys.stderr)
        return 2

    # Re-exec inside geg's venv so `import geg` resolves without polluting this
    # interpreter's environment.
    if os.environ.get("_GEG_REEXEC") != "1":
        if not venv_python.exists():
            print(f"FAIL: no geg venv at {venv_python}\n"
                  f"      pass the geg repo path or set GEG_REPO",
                  file=sys.stderr)
            return 2
        env = {**os.environ, "_GEG_REEXEC": "1"}
        return subprocess.call(
            [str(venv_python), str(Path(__file__).resolve()), str(geg_repo)], env=env
        )

    att_failed, att_total = check_attestations()
    cfg_failed, cfg_total = check_configs()

    failures = att_failed + cfg_failed
    total = att_total + cfg_total
    if failures:
        print(f"\nFAIL: {failures}/{total} artifacts rejected by geg", file=sys.stderr)
        return 1
    print(f"\nPASS: geg accepts all {total} artifacts "
          f"({att_total} attestations, {cfg_total} configs)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
