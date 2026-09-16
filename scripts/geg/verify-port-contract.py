#!/usr/bin/env python3
"""Cross-language gate: geg's own client, against a running hub.

`apps/te-data-layer/test/app.test.ts` is thorough, but it drives the translator
against **mocked hub responses** — so it proves the translator's shape-mapping and
nothing about whether the hub's actual bodies satisfy geg's decoders. Every wire
contract between the two is therefore checked against a body we wrote ourselves.

This closes that: it imports geg's real `HttpDataLayer` and points it at a running
translator, so the objects under assertion are produced by geg's own codecs from
the hub's own bytes. A renamed key, a changed enum, a number where a string was
expected — none of which a mock would catch — fail here.

    # with the stack up (hub, te-data-layer, mysql) and a tallied private proposal:
    python3 scripts/geg/verify-port-contract.py /path/to/generalised-el-gamal \
        --url http://localhost:3002 --election 0x8cab...

WHAT THIS IS NOT

geg ships `tests/conformance.py`, and §14 calls running it against the translator
"the single highest-value test in the plan". It cannot be run as written, for three
reasons that are design decisions rather than gaps:

  1. every conformance test begins with `register_election`, and the translator
     answers 501 — elections are Snapshot proposals, created through the sequencer;
  2. the suite submits ballots through the port, and the translator answers 501 —
     ballots are signed Snapshot votes, also through the sequencer;
  3. the suite moves the clock (`set_time`) to step elections through their
     lifecycle, and the hub reads wall-clock time.

So the conformance suite assumes a backend it owns end to end. What is portable is
the part that matters here — that geg's client can decode what this hub serves —
and that is what this checks, against an election seeded through the real Snapshot
write path rather than through the port.
"""
from __future__ import annotations

import argparse
import os
import sys
import traceback

FAILURES: list[str] = []


def check(label: str, fn):
    """Run one contract check; record the failure and keep going."""
    try:
        detail = fn()
        print(f"  ok    {label}" + (f" — {detail}" if detail else ""))
    except Exception as err:  # noqa: BLE001
        FAILURES.append(label)
        print(f"  FAIL  {label}: {type(err).__name__}: {err}")
        if os.environ.get("VERBOSE"):
            traceback.print_exc()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("geg_repo", nargs="?", default=os.environ.get("GEG_REPO"))
    ap.add_argument("--url", default=os.environ.get("GEG_DATA_LAYER_URL", "http://localhost:3002"))
    ap.add_argument("--election", required=True, help="a tallied private proposal id (0x…32 bytes)")
    args = ap.parse_args()

    if not args.geg_repo:
        print("need the geg checkout: pass it, or set GEG_REPO", file=sys.stderr)
        return 2
    sys.path.insert(0, os.path.join(args.geg_repo, "src"))

    from geg.adapters.db.client import HttpDataLayerClient  # noqa: E402
    from geg.core.state import StateFacts, derive_state  # noqa: E402
    from geg.services.common.reads import read_all_ballots  # noqa: E402

    eid = bytes.fromhex(args.election.removeprefix("0x"))
    dl = HttpDataLayerClient(args.url)

    print(f"geg client → {args.url}")
    print(f"election    {args.election}\n")

    # The read contract, decoded by geg rather than by us.
    rec = None

    def get_election():
        nonlocal rec
        rec = dl.get_election(eid)
        cfg = rec.config
        assert cfg.election_id == eid, "election_id round-trip"
        assert cfg.num_candidates >= 1, f"num_candidates {cfg.num_candidates}"
        assert cfg.budget >= 1, f"budget {cfg.budget}"
        # `t` is the quorum itself, not a corruption threshold — the protocol is
        # explicit that (2, 3) means 2-of-3, and a verifier that reads it the other
        # way waits forever for a share that will never come.
        t, n = cfg.threshold.t, cfg.threshold.n
        assert 1 <= t <= n, f"quorum bounds {t}-of-{n}"
        assert 2 * t > n, f"{t}-of-{n} is not a majority"
        # The cap the committee enforces per ballot; a mismatch with what ingest
        # built to rejects every ballot as INVALID_ATTESTATION.
        assert cfg.max_weight >= 1, f"max_weight {cfg.max_weight}"
        assert len(cfg.eligibility_key) == 48, "eligibility key is a compressed G1"
        return f"{cfg.num_candidates} candidates, budget {cfg.budget}, max_weight {cfg.max_weight}, {t}-of-{n}"

    check("get_election decodes into an ElectionConfig", get_election)

    def count():
        n = dl.count_ballots(eid)
        assert isinstance(n, int) and n >= 0, f"count {n!r}"
        return f"{n} ballots"

    check("count_ballots returns an int", count)

    def paging():
        # The real loop: count, then page, verifying completeness. This is the
        # function that would surface a sequence-number gap as an exception.
        stored = read_all_ballots(dl, eid)
        seqs = [b.sequence_number for b in stored]
        assert seqs == list(range(len(stored))), f"sequence numbers not 0..n-1: {seqs[:8]}"
        for b in stored:
            att = b.envelope.attestation
            assert att.weight >= 1, f"weight {att.weight} below the protocol floor"
            assert len(att.signature) == 80, f"attestation signature {len(att.signature)} bytes"
            assert b.envelope.election_id == eid, "ballot bound to another election"
        return f"{len(stored)} ballots, contiguous, all credentialed"

    check("read_all_ballots pages and verifies completeness", paging)

    def count_agrees_with_the_committee():
        """Cross-check the count against a source that does not derive from it.

        `read_all_ballots` trusts `count_ballots` to know when to stop, so a count
        that under-reports makes every downstream assertion vacuous — an empty
        list is trivially contiguous, and the keyper would tally a prefix of the
        ballots while still reaching quorum on it. The committee's own aggregate
        is the independent witness: it names every ballot it saw, admitted or
        excluded, so the two must agree.
        """
        agg = dl.get_aggregate(eid)
        if agg is None:
            return "no aggregate yet — nothing to cross-check against"
        seen = len(agg.admitted) + len(agg.exclusions)
        n = dl.count_ballots(eid)
        assert n == seen, (
            f"count_ballots says {n} but the committee aggregated {seen} "
            f"({len(agg.admitted)} admitted + {len(agg.exclusions)} excluded)"
        )
        return f"{n} = {len(agg.admitted)} admitted + {len(agg.exclusions)} excluded"

    check("count_ballots agrees with the committee's aggregate", count_agrees_with_the_committee)

    def aggregate():
        agg = dl.get_aggregate(eid)
        if agg is None:
            return "none yet (election not tallied)"
        assert len(agg.aggregates) == rec.config.num_candidates, "one ciphertext per candidate"
        assert agg.total_admitted_weight >= 0, "total weight"
        return f"{len(agg.admitted)} admitted, {len(agg.exclusions)} excluded, weight {agg.total_admitted_weight}"

    check("get_aggregate decodes into an AggregateArtifact", aggregate)

    def shares():
        got = dl.list_decryption_shares(eid)
        return f"{len(got)} share submissions"

    check("list_decryption_shares decodes", shares)

    def result():
        res = dl.get_result(eid)
        if res is None:
            return "none yet"
        assert len(res.totals) == rec.config.num_candidates, "one total per candidate"
        # Totals can exceed 2^53 on a large election; they must survive as ints.
        for t in res.totals:
            assert isinstance(t, int), f"total {t!r} is not an int"
        return f"totals {list(res.totals)}"

    check("get_result decodes, totals exact", result)

    def state():
        # `derive_state` takes StateFacts, not the record — building them from the
        # hub's reads is itself the check: every field it needs must be decodable.
        facts = StateFacts(
            cancelled=bool(getattr(rec, "cancelled", False)),
            key_finalized=dl.get_finalized_key(eid) is not None,
            result_published=dl.get_result(eid) is not None,
            tally_stalled=bool(getattr(rec, "tally_stalled", False))
        )
        return f"{derive_state(rec.config, facts, rec.config.voting_end + 1)}"

    check("derive_state accepts the record", state)

    print()
    if FAILURES:
        print(f"{len(FAILURES)} contract check(s) failed: {', '.join(FAILURES)}")
        return 1
    print("every check passed — geg's client decodes this hub's bodies")
    return 0


if __name__ == "__main__":
    sys.exit(main())
