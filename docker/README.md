# Running the Snapshot stack with Docker

This compose file brings up **Snapshot's half** of the system: the hub, the
sequencer, the translator, and MySQL. One command, from the monorepo root:

```sh
cp .env.example .env     # fill in the values it asks for
docker compose up -d
```

## What comes up

| Service         | Port | Role                                                                 |
| --------------- | ---- | -------------------------------------------------------------------- |
| `mysql`         | 3306 | `snapshot_hub` + `snapshot_sequencer` (schemas auto-loaded on first boot) |
| `hub`           | 3000 | GraphQL + REST API; stores ballots, committee artifacts and results    |
| `sequencer`     | 3001 | Vote ingestion, proposal writes, and the scores mirror                 |
| `te-data-layer` | 3002 | Translator: presents the hub to the private-voting protocol as its data layer |

All three services run the same image (`docker/backend.Dockerfile`) with
different entry points, so a rebuild covers all of them.

## What does *not* come up: the committee

Private voting needs a keyper committee and a coordinator. **They are not in this
repository and cannot be started from here.** They belong to the
generalised-el-gamal protocol, and each keyper is meant to be run by an
independent operator with its own signing key.

That separation is the security property, not an inconvenience: a committee this
repository could start is a committee this repository could impersonate, and the
whole point of a threshold scheme is that no single party can decrypt a tally
alone. An earlier version of this stack did bundle three keypers and an auto-DKG
driver into this compose file; that arrangement gave one `docker compose up` the
power to read every ballot.

The stack starts and runs fine without them — public voting is entirely
unaffected. Private proposals simply cannot be created until `TE_KEYPERS` points
at reachable keypers.

**For the full system**, including the committee and a private vote end to end,
see [`../RUNNING.md`](../RUNNING.md).

## Prerequisites

- Docker Desktop (or Docker Engine) with Compose v2.
- The UI runs on the host, not in a container — operators usually deploy it as
  static assets behind their own CDN.

## Checking it came up

```sh
docker compose ps
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/graphql   # 400 is correct
curl -s localhost:3002/elections                                  # {"electionIds":[...]}
```

A bare `GET` on `/graphql` answering **400** is the healthy response — it only
accepts POSTs. The translator returning a JSON list means the hub is reachable
through it, which is what the keypers and coordinator depend on.

### Run the UI against the stack

```sh
cd apps/ui
bun install        # once
bun run dev        # http://localhost:8080, pointed at the hub and sequencer
```

## Configuration worth knowing

Everything is read from `.env`; see `.env.example` for the full list with
explanations. Three settings cause confusing failures if they are wrong:

- **`TE_KEYPERS`** — one URL per committee member, no addresses. The sequencer
  reads each keyper's signing address from its `/status` when it freezes a
  committee onto a proposal. Every keyper must be reachable when a private
  proposal is created; the key ceremony needs all of them.

- **`SEQUENCER_PUBLIC_URL`** — where the **browser** should reach the sequencer.
  The hub 307-redirects `/api/scores/:id` here, and the UI calls that to finalise
  a closed proposal's scores. It defaults to `http://localhost:${SEQ_PORT:-3001}`.
  Set it to a container-internal hostname and the browser cannot resolve the
  redirect, the fetch fails silently, and every closed proposal sits on
  "Finalizing results" forever.

- **`MIN_DKG_LEAD_TIME_S`** (default 180) — how far ahead a private proposal must
  open. The committee needs that long to generate the election key, and a
  proposal whose voting opens without one is terminally dead, not merely late.

## Networking notes

- Services reach each other by compose service name (`mysql`, `hub`, …).
- MySQL runs without TLS on the private compose network, so the hub and sequencer
  set `DB_SSL=false`. The MySQL helpers only attempt TLS when `DB_SSL` is not
  `false`, which leaves host-run dev against a managed database unchanged.
- The keypers and coordinator are separate stacks, on separate hosts in a real
  deployment, so the translator's port is published rather than internal-only.
- **Host port conflicts.** Only the host side of each mapping is configurable;
  containers always reach each other on fixed internal ports. Override just the
  one that clashes:

  ```sh
  HUB_PORT=3010 docker compose up -d
  ```

  Overridable: `HUB_PORT`, `SEQ_PORT`, `MYSQL_PORT`, `TE_DATA_LAYER_PORT`.

## Rebuilding

The image does not rebuild on `up`. After changing application code:

```sh
docker compose build && docker compose up -d
```

Skipping the build is a quiet failure mode: the containers keep running the code
baked into the last image, so a fix looks deployed and is not.

## Resetting state

```sh
docker compose stop      # keeps all data; the next start resumes where it left off
docker compose down -v   # removes the MySQL volume, wiping every proposal and vote
```

`down -v` is not recoverable for private proposals. Their ballots are encrypted
under keys the keypers hold per election, so a wiped database cannot be
reconstructed from anything the committee still has.
