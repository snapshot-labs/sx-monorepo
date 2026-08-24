# Agent

Runner that casts votes on behalf of users who authorized the agent's signer as an
alias. It watches the spaces listed in `SPACES`. Predictions are real model
calls, casting is still a placeholder, so it runs in dry run only.

## Pipeline

One loop, four steps, a Postgres `jobs` table keyed by `(proposal, voter)` as the
source of truth. Every tick runs the steps in order:

| Step      | What it does                                                                                                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reap`    | Frees jobs whose runner died mid prediction, and drops jobs whose proposal has closed                                                                                                     |
| `plan`    | Reads active proposals in the watched spaces and the addresses that authorized `AGENT_SIGNER_ADDRESS` as an alias, drops voters who already voted, and inserts one job per remaining pair |
| `predict` | Asks the model how each voter would vote, using their own history in that space                                                                                                           |
| `cast`    | Logs what each predicted job would vote and marks it `skipped` with reason `dry_run`. This is where signing and submission to the sequencer go                                            |

The next tick is scheduled once the previous one settles, so ticks never overlap
and a failing tick does not stop the loop. Jobs are inserted with
`ON CONFLICT DO NOTHING`, so a crashed run is safe to repeat.

Both `predict` and `cast` take their batch with `FOR UPDATE SKIP LOCKED`, so a
second replica works on other rows instead of the same ones.

They differ in how long they hold it. `cast` is fast and local, so it claims and
finishes inside one transaction, and a crash rolls the batch back. `predict`
calls a model, which is far too slow to hold a transaction open for, so it marks
its batch `predicting` with a lease in `locked_until`, commits, and only then
calls the model. `reap` puts rows back to `pending` once their lease runs out.

### Job states

```
pending -> predicting -> predicted -> skipped (dry_run)
   ^            |
   +-- reap ----+  lease ran out, attempts + 1

skipped: already_voted, thin_history, low_confidence, proposal_closed, dry_run
failed:  three attempts used up
```

A prediction is only kept when the model reports confidence of at least
`medium`. Voters with fewer than three votes in the space are skipped before
any call is made, since there is nothing to predict from.

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
`AGENT_SIGNER_ADDRESS`, without `OPENROUTER_API_KEY`, without at least one space
in `SPACES`, or with `DRY_RUN` disabled while casting is a placeholder.

Set `LOGTAIL_HOST` and `LOGTAIL_TOKEN` to ship logs to Better Stack, otherwise
logs are pretty printed outside production and JSON in it.
