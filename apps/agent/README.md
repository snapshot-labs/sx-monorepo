# Agent

Runner that casts votes on behalf of users who authorized the agent's signer as an
alias. It watches the spaces listed in `SPACES`, and never actually votes:
predictions and casting are placeholders, so it runs in dry run only.

## Pipeline

One loop, three steps, a Postgres `jobs` table keyed by `(proposal, voter)` as the
source of truth. Every tick runs the steps in order:

| Step      | What it does                                                                                                                                                                     |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plan`    | Reads active proposals in the watched spaces and the addresses that authorized `AGENT_SIGNER_ADDRESS` as an alias, drops voters who already voted, and inserts one job per remaining pair |
| `predict` | Picks a choice for every job whose casting window has opened. Hardcoded to the first choice, this is where the model call goes                                                   |
| `cast`    | Logs what each predicted job would vote and marks it `skipped` with reason `dry_run`. This is where signing and submission to the sequencer go                                   |

The next tick is scheduled once the previous one settles, so ticks never overlap
and a failing tick does not stop the loop. Jobs are inserted with
`ON CONFLICT DO NOTHING`, so a crashed run is safe to repeat.

`predict` and `cast` claim their batch with `FOR UPDATE SKIP LOCKED`, so a
second replica works on other rows rather than the same ones, and a crash rolls
its batch back instead of stranding it. That holds while the work between
claiming a row and writing its result stays local: once `predict` calls a model,
it has to claim rows into an in-flight status and do the slow part outside the
transaction.

Only `single-choice` and `basic` proposals are eligible: those are the types whose
choice a single index can express. Encrypted (`shutter`) and flagged proposals are
skipped.

## Development

```bash
bun install
cp .env.example .env
bun run dev
```

`dev` and `start` apply pending migrations first, so both need the Postgres from
`scripts/docker-compose.yml` and its `agent` database to be up.

| Script                | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `bun run dev`         | Run with watch mode                                     |
| `bun run start`       | Run                                                     |
| `bun test`            | Run tests                                               |
| `bun run db:generate` | Generate a migration from `src/db/schema.ts`            |
| `bun run db:migrate`  | Apply pending migrations, also run by `dev` and `start` |

`GET /` reports the name, version, watched spaces, signer address, shared
context and dry run state. The UI reads it to know which address to authorize
and what the agent votes with.

## Configuration

See `.env.example`. The runner refuses to start without a valid
`AGENT_SIGNER_ADDRESS`, without at least one space in `SPACES`, or with
`DRY_RUN` disabled while casting is a placeholder.

Set `LOGTAIL_HOST` and `LOGTAIL_TOKEN` to ship logs to Better Stack, otherwise
logs are pretty printed outside production and JSON in it.
