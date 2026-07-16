# Running permanent private voting with Docker

This stack lets a Snapshot operator run the whole permanent-private-voting
backend - hub, sequencer, a 3-keyper threshold committee, and an automatic
DKG coordinator - with a single command. It is the off-chain, self-hosted
equivalent of the on-chain threshold-ElGamal committee: keypers still run
Feldman VSS distributed key generation and threshold partial-decryption with
DLEQ proofs, but DKG results and decryption shares travel over HTTP to the hub
instead of an on-chain bulletin board.

## What comes up

| Service     | Port        | Role                                                        |
| ----------- | ----------- | ---------------------------------------------------------- |
| `mysql`     | 3306        | `snapshot_hub` + `snapshot_sequencer` (schema auto-loaded) |
| `hub`       | 3000        | GraphQL + REST API, collects and finalises DKG results     |
| `sequencer` | 3001        | Vote ingestion and the threshold tally worker              |
| `keyper1-3` | 5001-5003   | Threshold committee members                                |
| `auto-dkg`  | -           | Watches for new private proposals and runs the DKG ceremony |

## Prerequisites

- Docker Desktop (or Docker Engine) with Compose v2.
- The UI is run separately on the host (see below); it is not containerised
  because operators usually deploy it as static assets behind their own CDN.

## Quick start

From the monorepo root (`sx-monorepo/`):

```sh
# Optional: override the baked-in dev defaults.
cp .env.example .env

docker compose up --build
```

First boot builds two images (the bun backend image shared by hub and
sequencer, and the Python keyper image shared by the three keypers and the
auto-dkg coordinator), initialises MySQL with both databases and their
schemas, and starts every service. Subsequent boots reuse the cached images
and the persisted MySQL volume.

Check health:

```sh
curl http://localhost:3000/api          # hub
curl http://localhost:3001              # sequencer
curl http://localhost:5001/status       # keyper 1
```

### Run the UI against the stack

```sh
cd apps/ui
bun install        # once
bun run dev        # serves on http://localhost:8080, pointed at the hub/sequencer
```

## How automatic DKG works

When a permanent-private proposal (`privacy='shutter-elgamal'`) is created, its
`te_mpk` (master public key) starts out `NULL`, so the UI shows a "generating
encryption keys" state and disables voting. The `auto-dkg` service polls the
hub database every couple of seconds, finds such proposals, writes the
committee allow-list (`te_keyper_addresses`) and config onto the proposal row,
then drives the keypers through the DKG ceremony. Each keyper signs its result
and POSTs it to the hub; once `t+1` keypers agree, the hub finalises `te_mpk`
and voting opens. This usually completes within a few seconds.

## Keyper committee keys

The three dev keypers use deterministic signing keys derived from
`sha256("keyper-{id}")`. Their addresses are:

| Keyper | Address                                      |
| ------ | -------------------------------------------- |
| 1      | `0xB4293721D07805e6aFf49a6A462C2C17Ef2445C7` |
| 2      | `0x818f35eFAe8b482B0c88EcFdfC94e49Af3a008C3` |
| 3      | `0x199fA19f3acb034a9C636D62847a12083805eE78` |

These are dev-only. For a real deployment, set `KEYPER_PRIVATE_KEY_1/2/3` in
`.env` to keys held by three independent operators (ideally each keyper runs on
separate infrastructure rather than one compose file).

## Networking notes

- Services talk to each other by compose service name (`mysql`, `hub`, ...).
- MySQL runs without TLS on the private compose network, so the hub and
  sequencer are started with `DB_SSL=false`. The MySQL helpers only attempt
  TLS when `DB_SSL` is not `false`, which keeps host-run dev (TLS to a managed
  DB) unchanged.
- **Host port conflicts.** Only the host side of each mapping is configurable;
  containers always reach each other on the fixed internal ports. If another
  process already holds a default port (for example something else listening on
  3000), override just that host port via env and leave the rest alone:

  ```sh
  HUB_PORT=3010 docker compose up
  ```

  Overridable: `HUB_PORT`, `SEQ_PORT`, `MYSQL_PORT`.

## Resetting state

```sh
docker compose down -v   # also removes the MySQL volume, wiping all data
```

Without `-v`, the `mysql-data` volume persists across `up`/`down` cycles, so
the schema init runs only on the very first boot.
