# services/keypers — threshold-ElGamal committee for permanent private voting

This service is the off-chain replacement for what the upstream
`thresholdELGamal` repo runs on a smart-contract bulletin board. The
keypers still run Feldman VSS DKG and threshold partial-decryption with
DLEQ proofs, byte-for-byte SDK-compatible. The only thing that changes
is the **transport** for two messages:

| message              | upstream                              | here                                           |
| -------------------- | ------------------------------------- | ---------------------------------------------- |
| DKG result           | `Election.voteDKGResult` on-chain     | `POST /api/proposal/{id}/te_dkg` to hub        |
| Decryption shares    | `Election.submitDecryptionShare`      | `POST /api/proposal/{id}/te_decryption_share`  |

The `dkg_coordinator.py` orchestration script is **unchanged** — the
keyper endpoints (`/dkg/round1`, `/dkg/distribute_*`, `/dkg/round2`,
`/dkg/publish_on_chain`) keep the same names, and only the body of the
last endpoint switched from web3 transactions to a hub HTTP POST.

## Layout

```
services/keypers/
├── Dockerfile
├── docker-compose.yml      # 3-keyper committee, exposes 5001 / 5002 / 5003
├── requirements.txt
├── README.md
└── src/
    ├── crypto/             # vendored from thresholdELGamal/src/crypto, untouched
    ├── dkg_coordinator.py  # vendored, untouched
    ├── hub_client.py       # NEW — replaces eth_client
    ├── keyper.py           # adapted: chain_config -> hub_config
    └── sdk_compat.py       # vendored, untouched (SDK-byte-equality is the parity gate)
```

## DKG secret retention

Each keyper persists per-proposal `combined_share` values encrypted to a file on disk (`dkg_secrets.enc`). After a successful `/decrypt/publish_on_chain` run, the share is kept for a configurable window so operators can re-trigger decryption if the hub path fails.

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `KEYPER_DKG_RETENTION_TIME` | `172800` (2 days) | Seconds to retain shares after decrypt. `0` disables pruning. |
| `KEYPER_DKG_PRUNE_INTERVAL_S` | `3600` | Background prune loop interval (seconds). |

Shares for proposals that have not yet decrypted successfully are never
pruned (`expires_at` unset until decrypt completes).

### State directory on the host

`docker-compose.yml` bind-mounts three host directories into the keyper
containers so the encrypted state files are visible on your machine and
survive `docker compose down -v`:

```
keyper-state/
  keyper1/   →  mounted to /keyper-state inside keyper1
  keyper2/   →  mounted to /keyper-state inside keyper2
  keyper3/   →  mounted to /keyper-state inside keyper3
```

**Before the first `compose up`, create these directories manually:**

```sh
mkdir -p keyper-state/keyper1 keyper-state/keyper2 keyper-state/keyper3
```

This matters on Linux: if Docker creates the directory automatically it
does so as `root:root`, which can cause permission errors if the
container ever runs as a non-root user. Pre-creating them as your own
user avoids the issue entirely. On Mac (Docker Desktop) this is not a
problem, but the one-liner is harmless to run regardless.

`keyper-state/` is in `.gitignore` — the files are Fernet-encrypted but
they contain secret key material and must never be committed.

## Auth

Every keyper-to-hub message is EIP-191 personal-signed by the keyper's
Ethereum signing key. The hub's allow-list is the proposal row's
`te_keyper_addresses` JSON column, populated at proposal create time
(Phase 7 admin space settings). The hub recovers the address from the
signature, looks up the keyper's index, and rejects if it doesn't match.

Domain separation tags (DSTs) are mirrored on both sides:

| DST                       | used by                                                           |
| ------------------------- | ----------------------------------------------------------------- |
| `SX-TE-DKG-v1`            | `submit_dkg_result` payload (proposal_id ‖ mpk ‖ sha256(committee_pks)) |
| `SX-TE-DECRYPT-v1`        | `submit_decryption_share` payload (proposal_id ‖ candidate ‖ sigma ‖ e ‖ z) |

See `src/hub_client.py` and `apps/hub/src/te.ts`.

## Tests

From `services/keypers/` with a venv (one-time setup):

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

python tests/test_dkg_persistence.py -v
```

## Local dev

```sh
# 1. Bring up the keypers (also start the hub on :3000 separately).
docker compose up --build

# 2. Run DKG against the running keypers.
python src/dkg_coordinator.py \
  --keypers http://localhost:5001,http://localhost:5002,http://localhost:5003 \
  --proposal-id 0xdeadbeef --n 3 --t 1
```

The default deterministic dev signing keys hash to:

| keyper id | signing key seed   |
| --------- | ------------------ |
| 1         | sha256("keyper-1") |
| 2         | sha256("keyper-2") |
| 3         | sha256("keyper-3") |

Their checksum addresses are derived at startup; the hub admin must
copy them into `te_keyper_addresses` for any test proposal that uses
this committee. Production deployments must use real, isolated keys
managed off-host.

## Phase status

This package was added in **Phase 2** of the permanent-private-voting
implementation. It is not yet exercised end-to-end:

- Phase 3 wires vote ingestion to the sequencer.
- Phase 4 wires the tally worker to populate `te_aggregate` on the
  proposal row, which is what the keyper's `/decrypt/publish_on_chain`
  endpoint reads.
- Phase 7 wires the admin UI that populates `te_keyper_*` on a proposal
  at creation time.

Until those land, the only useful operation against a running committee
is the DKG flow — and even that needs Phase 7 to populate the keyper
allow-list before the hub will accept the result.
