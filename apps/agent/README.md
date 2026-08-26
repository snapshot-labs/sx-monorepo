# Agent

Runner that casts votes on behalf of users who authorized the agent's signer as
an alias. It watches the spaces listed in `SPACES` and sends real votes. Set
`DRY_RUN=true` to work out what it would vote and send nothing.

## Pipeline

One loop, four steps, a Postgres `jobs` table keyed by `(proposal, voter)` as the
source of truth. Every tick runs the steps in order:

| Step      | What it does                                                                                                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reap`    | Frees jobs whose runner died mid prediction, and drops jobs whose proposal has closed                                                                                                     |
| `plan`    | Reads active proposals in the watched spaces and the addresses that authorized `AGENT_SIGNER_ADDRESS` as an alias, drops voters who already voted, and inserts one job per remaining pair |
| `predict` | Asks the model how each voter would vote, from the proposal and the context that voter saved for that space                                                                               |
| `cast`    | Re-checks the job is still safe to send, signs the vote as the voter's alias and hands it to the sequencer. In dry run it does not run at all                                             |

The next tick is scheduled once the previous one settles, so ticks never overlap
and a failing tick does not stop the loop. Jobs are inserted with
`ON CONFLICT DO NOTHING`, so a crashed run is safe to repeat.

Both `predict` and `cast` take their batch with `FOR UPDATE SKIP LOCKED`,
closing soonest first, so a second replica works on other rows instead of the
same ones. Neither holds the transaction while it works: the model and the
sequencer are both far too slow for that. Each marks its batch `predicting` or
`casting` with a lease in `locked_until`, commits, and only then makes the call.
`reap` puts a row back once its lease runs out.

### Job states

```
pending -> predicting -> predicted -> casting -> cast
   ^            |            ^           |
   +-- reap ----+            +-- reap ---+   lease ran out, attempts + 1

skipped: already_voted, no_context, low_confidence, proposal_closed,
         alias_expired, rejected, no_choice, unknown_choice, proposal_gone
failed:  three attempts used up
```

A stale `casting` job goes back to `predicted`, never to `pending`: the
prediction is already paid for and must not be bought twice.

A prediction is only kept when the model reports confidence of at least
`medium`. A voter with no context saved for that space is skipped before any
call is made, since there is nothing to decide from.

### Private context

Each person writes their own context per space, and it is the only thing besides
the proposal that decides their vote. It is private, so reading and writing both
carry an EIP-712 message signed by the alias key kept in that person's browser,
the same shape keycard uses for api keys. `verifySigner` checks the signature
belongs to the alias, that the message is minutes old at most, and asks the hub
whether that alias still speaks for the address.

| Route               | What it does                                                                  |
| ------------------- | ----------------------------------------------------------------------------- |
| `POST /context/get` | Returns every context that person saved, for all spaces                       |
| `POST /context/set` | Saves the context for one watched space, or removes it when the text is empty |

### Before a vote goes out

`plan` checks whether the person already voted, but that is when the job is
made, so `cast` checks again right before sending. It also re-checks that the
proposal is still open and that the alias has not lapsed, since authorization
runs out after 90 days. Votes leave `CAST_GAP` apart and no more than
`CAST_BATCH` per tick, because the sequencer allows 100 requests a minute per IP.

Each vote carries `app: snapshot-agent` and the model's reasoning as its public
reason, so anyone reading the proposal can tell it was machine made and why.
The sequencer's message id is stored in `vote_id`.

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

`GET /` reports the name, version, watched spaces, signer address and dry run
state. The UI reads it to know which address to authorize and what the agent
votes with.

## Configuration

See `.env.example`. The runner refuses to start without `AGENT_PRIVATE_KEY`,
without `OPENROUTER_API_KEY`, or without at least one space in `SPACES`. The
signer address is derived from the key, so there is nothing to keep in step with
it, and `GET /` publishes it for the UI.

Set `LOGTAIL_HOST` and `LOGTAIL_TOKEN` to ship logs to Better Stack, otherwise
logs are pretty printed outside production and JSON in it.
