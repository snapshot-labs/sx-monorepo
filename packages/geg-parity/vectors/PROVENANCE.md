# geg conformance vectors — vendored copy

**Do not hand-edit.** Regenerate with:

```bash
node scripts/sync-geg-vectors.mjs /path/to/generalised-el-gamal
```

| | |
|---|---|
| Source repo | `generalised-el-gamal` |
| Source path | `tests/vectors/` |
| Commit | `febfe12039a9d340f914b9ba63a601773e7dc6c0` |
| Commit date / subject | 2026-08-22T12:56:19+05:30 feat(voting): bind each ballot to the credential it was cast with, and encrypt the coordinator's token store |
| Vectors | 25 across 12 categories |

- `attestation/` — 5
- `ballot/` — 4
- `binding/` — 1
- `budget/` — 2
- `decrypt-share/` — 4
- `dleq/` — 1
- `encrypt/` — 1
- `flow/` — 1
- `or/` — 1
- `scale/` — 1
- `schnorr/` — 2
- `tally/` — 2

## Why these are checked in

`tests/geg-parity.test.ts` in this package is a **blocking gate**: it proves the pinned
`@shutter-network/urban-verified-crypto` build agrees byte-for-byte with what
geg's Python implementation verifies, which is the premise the whole integration
rests on. A gate that skips when a sibling checkout is missing is not a gate, so
the vectors live here and CI runs them unconditionally.

## Do not regenerate these locally

The corpus is geg-owned. The only thing that may rewrite it is
`sync-geg-vectors.mjs`, pointed at a geg checkout. Producing the vectors from
this side instead would leave the gate passing while it verified nothing but its
own output.

Every file here is accounted for: the gate fails if a vector on disk is neither
checked directly nor listed as covered through a composite path, so a vector geg
adds later cannot be silently skipped.
