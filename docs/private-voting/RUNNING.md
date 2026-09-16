# Running a private vote end to end

A copy-paste walkthrough: from an empty machine to a decrypted tally on screen.

Everything here has been run as written. Where a value is a placeholder you must
replace, it says so; everything else can be pasted verbatim.

**One repository, two trust domains.** Everything starts from this repo — the
[generalised-el-gamal][geg] protocol ships as a published image, so there is no
second checkout. What stays separate is what matters: **the keypers**. Each runs as
its own compose project with its own signing key, and the secrecy of a ballot rests
on no quorum of them colluding. A committee this repo could start is a committee
this repo could impersonate, so the keypers are deliberately not in
`docker-compose.yml` and in a real deployment do not run on this machine at all.

The coordinator *is* in `docker-compose.yml`, because it is the admin's own service:
it relays writes and publishes the result. It cannot produce a decryption share, and
the result it publishes is checkable by anyone — the UI re-derives the tally from the
ballots and verifies the totals against the aggregate.

[geg]: https://github.com/shutter-network/generalised-el-gamal

```
sx-monorepo (docker compose)         separate projects, separate machines
  mysql        :3306                   keyper1        :8101
  hub          :3000                   keyper2        :8102
  sequencer    :3001                   keyper3        :8103
  te-data-layer:3002
  coordinator  :8400
  UI (host)    :8080
```

---

## 0. Prerequisites

- Docker Desktop running
- [Bun](https://bun.sh)
- A browser wallet (MetaMask) with an account you control — you will vote with it
- This repo checked out. The protocol image is pulled from ghcr.

One variable, used by the space SQL in step 3 and by `.env` in step 1 — set it
in the terminal you will use throughout (step 3 adds a second, `TOKEN`):

```bash
export MY_WALLET=0xYourWalletAddressHere   # the account in your browser wallet
```

It becomes the space admin and the identity allowed to retry a stalled tally. Use an
address you can actually sign with — and, since the space in step 3 reads voting
power from a real ERC-20 balance, one that actually holds some of that token.

---

## 1. Environments

Five files: `.env`, one per keyper, and the UI's. A script writes the first four,
because they share identities that must agree; the UI's is three lines you paste.

### 1a. Identities — `.env` and `.env.keyper1..3`

One command writes all four files:

```bash
cd sx-monorepo
python3 scripts/geg/gen-env.py            # prints the plan, writes nothing
python3 scripts/geg/gen-env.py --write
```

It mints a key per identity and derives every address from the key that owns it:

| written | holds |
| --- | --- |
| `.env` | the hub and sequencer's own secrets, the committee as URLs, the coordinator's signing key and relay token, the eligibility issuer's key |
| `.env.keyper1..3` | one signing key per committee member, plus that member's port and state directory |

All four are `chmod 600` and gitignored.

**This is the step that used to go wrong.** One address is written in three places —
`COORDINATOR_SIGNING_KEY` in `.env`, `TE_RESULT_PUBLISHER_ADDRESS` beside it, and
`COORDINATOR_IDENTITY` in every keyper file — and when they drift the failure is an
authorisation error naming neither side, hours later, on a proposal whose ballots are
already cast. Deriving all three from one key is the whole reason this script exists.

Two values still want a human. Both are carried through untouched on a re-run, so
this applies to a first run, or after you delete `.env`:

- **`WALLETCONNECT_PROJECT_ID`** is written as a placeholder. Fill it in, or leave it
  and use an injected wallet like MetaMask.
- **`TE_SOLVER_CEILING`** starts at `1e12`, which suits roughly a 0.5 GB coordinator.
  It decides every proposal's `scale`, so it is a statement about your hardware — see
  the RAM table in `.env.example` before changing it.

Re-running is safe and is how you repair a file you edited by mistake: existing keys
are read back off disk and only the derived values are recomputed. `--rotate` mints
new ones instead, which **orphans every election already in flight** — a keyper that
changes its key cannot finish an election it holds a share for.

`.env.example` is the annotated reference for every variable, including the ones this
script does not set.

### 1b. What the committee files mean

Worth knowing before you start anything, because two of these only fail at tally time:

- **Each keyper needs its own `KEYPER_STATE_DIR_HOST`.** Two sharing a directory
  overwrite each other's shares, and nothing complains until a tally cannot reach
  quorum. The script assigns `./keyper-state1`, `2`, `3`.
- **`KEYPER_PORT` must match that keyper's entry in `TE_KEYPERS`.** The URLs are
  dialled from inside the coordinator's container, which is why they are
  `host.docker.internal` and not `localhost`.
- **`TE_KEYPERS` carries URLs and no addresses.** The sequencer reads each keyper's
  signing address from its own `/status` when it freezes the committee onto a
  proposal, and refuses two URLs that answer with the same address. A second copy of
  the address here would only be somewhere for it to go stale.
- **`TE_THRESHOLD_T` is the quorum, not the fault tolerance** — the number of keypers
  that must act together. It has to be a strict majority, so 2 of 3.

### 1c. The UI — `sx-monorepo/apps/ui/.env`

```bash
cd sx-monorepo/apps/ui
cat >> .env <<'EOF'
VITE_HOST=localhost
VITE_LOCAL_HUB_URL=http://localhost:3000/graphql
VITE_LOCAL_SEQUENCER_URL=http://localhost:3001
# Must match MIN_DKG_LEAD_TIME_S, or the editor lets you pick a start time the
# sequencer then rejects.
VITE_MIN_DKG_LEAD_TIME_S=180
# Must match TE_WEIGHTED_BUDGET, or the UI quotes the wrong per-voter ceiling
# (1,000,000 / budget) when explaining private voting.
VITE_TE_WEIGHTED_BUDGET=100
EOF
```

Other `VITE_*` keys (Alchemy, Infura, Etherscan, WalletConnect) enable chain-data
features — token balances, ENS, richer wallet options. None are needed here.

> **Why is there no admin private key anywhere?** There isn't one.
> The single admin action — retrying a stalled tally — is signed in the browser by
> a **space admin**, and the space's admin list is the gate. A key in a file beside
> the coordinator's key would not be a separation of authority, just two files on
> one disk; and a single configured address would be per-deployment, letting one
> space's admin clear another space's stalls.

---

## 2. Start everything

Snapshot's services and the coordinator together — the coordinator waits on the
translator's healthcheck, so one command is enough:

```bash
cd sx-monorepo
mkdir -p mysql-data
docker compose up -d --build
```

If this fails with `required variable COORDINATOR_SIGNING_KEY is missing`, step 1a
has not been done. The coordinator is fail-closed on its two secrets, and compose
refuses to start *any* service until both are in `.env`.

Then the committee. Each keyper runs as its own compose project, which is what keeps
their state directories and containers separate:

```bash
for n in 1 2 3; do
  docker compose -p keyper$n -f docker-compose.keyper.yml \
    --env-file .env.keyper$n up -d
done
```

The first run builds the Snapshot image and pulls the protocol image; both are cached
afterwards. `--build` applies only to the Snapshot services — the coordinator and the
keypers run a pinned published image, so you move them by changing the tag
(`GEG_IMAGE`), not by rebuilding.

Check it came up:

```bash
docker ps --format "{{.Names}}\t{{.Status}}"            # 8 containers, all healthy
curl -s localhost:8400/health                          # coordinator
curl -s localhost:8101/status | python3 -m json.tool   # and 8102, 8103
curl -s localhost:3002/elections                       # {"electionIds":[]}
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/graphql   # 400 is correct
```

Each keyper's `/status` should report its own `address` — those three must be the
addresses in `TE_KEYPERS`, or the sequencer will refuse to freeze a committee.

On a first run they will all say **`"bootstrapped": false`, and that is correct.**
A keyper is bootstrapped when the coordinator installs its tokens over
`/auth/bootstrap`, and the coordinator only does that when it has an election to run
a ceremony for — so the flag stays false until you create your first private
proposal. It is persisted from then on, so after a restart with its state directory
intact a keyper reports `true` immediately. `false` on a keyper that has already
taken part in an election means its state was lost.

A bare GET on `/graphql` answering `400` is right — it only accepts POSTs.

**To stop everything, keeping all data:**

```bash
for n in 1 2 3; do
  docker compose -p keyper$n -f docker-compose.keyper.yml \
    --env-file .env.keyper$n stop
done
docker compose stop
```

`stop`, not `down`: MySQL's data and each keyper's encrypted share volume survive,
so the next start resumes the same elections. Use `down -v` only for a clean slate,
which permanently destroys every share and therefore every undecrypted tally.

---

## 3. Get a space to propose in

A fresh database has no space, so there is nothing to propose in yet. Two ways to
fix that:

- **Create one from the UI** once step 4 is running — the ordinary Snapshot flow,
  and the one to use if you want to click through space creation as a user would.
- **Seed one directly in the database**, below. Faster, repeatable, and it lets you
  pin the exact strategy you want to test rather than filling in a form.

The rest of this section is the second option. It is three separate inserts, and
each one is needed for a different reason.

### 3a. Mark Sepolia as premium

The sequencer refuses proposals from a network that is not marked premium, so this
must exist before any space can be used.

```bash
cd sx-monorepo
docker exec -i sx-monorepo-mysql-1 mysql -uroot -h127.0.0.1 snapshot_hub <<'EOF'
INSERT IGNORE INTO networks (id, name, testnet, premium)
VALUES ('11155111', 'Sepolia', 1, 1);
EOF
```

### 3b. Insert the space

Voting power here is a **real ERC-20 balance** read from Sepolia, which is what a
private proposal exercises properly: the sequencer reads the token's `totalSupply()`
to size the tally, and each voter's weight is their own balance.

Two fields decide whether this works:

- **`address`** — the token. The one below is a Sepolia test token; substitute your
  own if you have one, and make sure the wallets you intend to vote with hold a
  balance of it. **A wallet holding none has no voting power and cannot vote.**
- **`decimals`** — must match the token. This one is 6. Passing 18 silently divides
  every balance by 10^12, so a genuine holder reads as dust and is refused with
  "voting power too low" — a wrong number, not an error, which makes it a slow thing
  to debug.

```bash
export TOKEN=0xabc...   # Sepolia test ERC-20

docker exec -i sx-monorepo-mysql-1 mysql -uroot -h127.0.0.1 snapshot_hub <<EOF
INSERT INTO spaces (id, name, settings, verified, deleted, flagged, hibernated,
                    turbo_expiration, proposal_count, vote_count, follower_count,
                    created, updated)
VALUES ('demo.eth', 'Demo Space',
  JSON_OBJECT(
    'name','Demo Space','network','11155111','symbol','TST',
    'strategies', JSON_ARRAY(JSON_OBJECT('name','erc20-balance-of',
        'network','11155111',
        'params', JSON_OBJECT('address','$TOKEN','symbol','TST','decimals',6))),
    'admins', JSON_ARRAY('$MY_WALLET'),
    'members', JSON_ARRAY(),
    'filters', JSON_OBJECT('minScore',0,'onlyMembers',false),
    'voting', JSON_OBJECT('delay',0,'period',0,'type','','quorum',0,
                          'blind',false,'hideAbstain',false,'privacy','any'),
    'validation', JSON_OBJECT('name','any','params',JSON_OBJECT()),
    'voteValidation', JSON_OBJECT('name','any','params',JSON_OBJECT()),
    'plugins', JSON_OBJECT()),
  0,0,0,0,0,0,0,0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())
ON DUPLICATE KEY UPDATE updated = UNIX_TIMESTAMP(), settings = VALUES(settings);
EOF
```

If you would rather not deal with token balances, swap the `strategies` array for
`JSON_ARRAY(JSON_OBJECT('name','ticket','network','11155111','params',
JSON_OBJECT('symbol','TST','value',100)))` — `ticket` gives every wallet the same
fixed power, so any account can vote. It is not a token strategy, so the sequencer
cannot read a supply from it and falls back to a derived bound; see
[Weight scaling](docs/private-voting/README.md#weight-scaling--the-units-a-proposal-counts-in).

### 3c. Raise the proposal limits

Defaults are low enough that repeated testing hits them, and the resulting error
talks about limits rather than about what you were doing.

```bash
docker exec -i sx-monorepo-mysql-1 mysql -uroot -h127.0.0.1 snapshot_hub <<'EOF'
INSERT IGNORE INTO options (name, value) VALUES
  ('space.default.proposal_limit_per_day','100'),
  ('space.default.proposal_limit_per_month','1000'),
  ('space.active_proposal_limit_per_author','200'),
  ('space.default.body_limit','20000'),
  ('space.default.choices_limit','20');
EOF
echo "space ready"
```

---

## 4. Start the UI

```bash
cd sx-monorepo/apps/ui
bun install     # first time only
bun run dev
```

Open **http://localhost:8080/#/s-tn:demo.eth/proposals** and connect the wallet
whose address you used as `MY_WALLET`.

---

## 5. Create a proposal — and watch the DKG

In the UI: **New proposal**. Then, before you submit:

- **Privacy → Permanent private voting.** This is the whole point; without it you
  get an ordinary public proposal and none of the machinery below runs.
- **Voting type → Weighted** (works with any type, but weighted is the interesting
  one — you spread 100 points across the choices).
- **Start time at least 3 minutes out.** This is `MIN_DKG_LEAD_TIME_S`. The
  committee needs to generate the election key *before* voting opens, and an
  election whose start passes without a key is permanently dead — not retryable.
  The editor nudges the start forward for you; do not drag it back.

Submit, then watch the ceremony:

```bash
docker logs -f sx-monorepo-coordinator-1
```

Within about 30 seconds (the coordinator's poll interval) you should see:

```
op=dkg status=starting    election=... committee=3 attempt=1
op=dkg phase=round1       status=ok    keypers=3
op=dkg phase=round2       status=ok    keypers=3 complaining=0
op=dkg phase=publish      status=ok    published=3/3
op=dkg status=finalized   election=...
```

`complaining=0` matters: a keyper that complains about another's shares halts the
ceremony deliberately rather than finalising a transcript it disagrees with.

Confirm the key landed:

```bash
docker exec sx-monorepo-mysql-1 mysql -uroot -h127.0.0.1 snapshot_hub \
  -e "SELECT title, te_mpk IS NOT NULL AS has_key FROM proposals ORDER BY created DESC LIMIT 1;"
```

The proposal page also shows the committee and key once this completes.

---

## 6. Vote

When the start time passes, vote in the UI. On a weighted proposal you distribute
100 points across the choices.

Your browser encrypts the ballot under the election key and proves — in zero
knowledge — that it is well formed and sums to the budget, without revealing the
split. What reaches the server is ciphertext. Nobody, including the hub, can read
an individual ballot at any point, now or later.

Check it was stored encrypted:

```bash
docker exec sx-monorepo-mysql-1 mysql -uroot -h127.0.0.1 snapshot_hub \
  -e "SELECT voter, vp, LEFT(choice, 80) AS ciphertext FROM votes ORDER BY created DESC LIMIT 1\G"
```

---

## 7. Wait for voting to end — the tally runs itself

Nothing to press. Past the end time, the coordinator drives two phases; watch:

```bash
docker logs -f sx-monorepo-coordinator-1
```

```
op=tally status=aggregating   ← every keyper re-derives the weighted sum independently
op=tally status=decrypting    ← a quorum agreed byte-for-byte; now they decrypt it
op=tally status=finalized
```

The gap between those first two lines is the property that matters. Each keyper
computes the aggregate from the same ballots on its own, and the result only counts
once **a quorum submits identical bytes** — so isolating one voter's ballot needs a
majority of the committee to collude, not one compromised process.

Allow a minute or two: the coordinator polls every 30 seconds.

---

## 8. The result

Refresh the proposal page. Scores are shown, and the **Permanent private tally**
panel appears with a **Verify tally** button. Press it: your browser re-downloads
every encrypted ballot and every decryption share, recomputes the aggregate,
re-checks each keyper's proof, and compares the total to what was published. You
are not trusting the server's number — you are recomputing it.

From the command line:

```bash
docker exec sx-monorepo-mysql-1 mysql -uroot -h127.0.0.1 snapshot_hub -e \
  "SELECT p.title, p.scores_state, p.scores, r.totals_json, r.keyper_indices
     FROM proposals p LEFT JOIN te_results r ON r.proposal_id = p.id
    ORDER BY p.created DESC LIMIT 1\G"
```

```
scores_state: final
      scores: [7.62, 1.79, 1.59]
 totals_json: ["762","179","159"]     ← raw, before dividing by the budget
keyper_indices: [1,2]                 ← which two of the three decrypted
```

`scores` is `totals_json / TE_WEIGHTED_BUDGET`. `keyper_indices` showing two of
three is the threshold working: the third never participated in the decryption and
did not need to.

---

## If something stalls

A tally the committee cannot finish is marked **stalled** and stops retrying — on
purpose, so a genuinely stuck election waits for a person instead of looping. The
proposal page shows a red notice, and because your wallet is the admin, a **Retry
tally** button.

Bring the keypers back *first*, then retry — retrying while they are down just
stalls again:

```bash
docker ps --format "{{.Names}}\t{{.Status}}" | grep keyper

# Restart any that are down (safe to run for all three):
for n in 1 2 3; do
  docker compose -p keyper$n -f docker-compose.keyper.yml \
    --env-file .env.keyper$n up -d
done
curl -s localhost:8101/status | python3 -m json.tool
```

The notice names three possible causes and asserts none, because the flag stored is
only a boolean. Which one it actually was is in the coordinator's log:

```bash
docker logs sx-monorepo-coordinator-1 2>&1 | grep abandoned
```

## Other things that go wrong

| Symptom | Cause |
|---|---|
| `proposal does not yet have a finalised threshold key` | you voted before the DKG finished, or the start time was under 3 minutes out |
| Proposal never gets a key, log says `voting_start passed without a key` | terminal — the start was too soon. Create a new one. |
| `Retry tally` missing on a stalled proposal | the connected wallet is not an admin of the proposal's space (step 3 sets that list) |
| Keypers unreachable from the coordinator | on Linux, `host.docker.internal` needs `--add-host=host.docker.internal:host-gateway` |
| UI shows no space | step 3 did not run, or you are on the wrong URL — it must be the `s-tn:` prefix |

## Where to read more

The design reasoning lives next to the code it governs, in the file headers — each
of these explains not just what it does but which failure it is shaped around:

| File | Covers |
|---|---|
| `apps/sequencer/src/helpers/teCommittee.ts` | how a committee is resolved from URLs and frozen onto a proposal, and why addresses are not configured |
| `apps/hub/src/helpers/gegDigests.ts` | the write-authorisation digests, and the encoding mistakes that produce valid-looking signatures nobody can verify |
| `apps/hub/src/te.ts` | the public audit surface, and why the writes moved out of it |
| `apps/sequencer/src/helpers/teTallyScheduler.ts` | which proposals the tally loop acts on, and the gate that keeps public ones out |
| `apps/sequencer/src/writer/delete-proposal.ts` | deleting a private proposal, and the committee artifacts that must go with it |
| `apps/ui/src/helpers/gegRequest.ts` | the digest the admin's retry is signed over |

For the protocol itself — the coordinator, the keypers, and the port contract this
repository implements — see the source in the generalised-el-gamal repository. You do
not need it checked out to run any of the above; it is the reference for what the
published image does.
