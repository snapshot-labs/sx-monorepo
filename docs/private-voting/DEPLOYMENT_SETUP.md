# Running a private vote end to end

A copy-paste walkthrough: from an empty machine to a decrypted tally on screen.

Everything here has been run as written. Where a value is a placeholder you must
replace, it says so; everything else can be pasted verbatim.

**What runs where.** Everything starts from this repository. The [Shutter Governance
Protocol][sgp] (SGP) ships as a published image, so you need no second checkout.

- **The keypers are separate.** Each keyper runs as its own compose project with its
  own signing key, and in a real deployment on another operator's machine. Ballots
  stay secret only while no quorum of keypers colludes, so this repository must not
  be able to start or impersonate the committee. That is why the keypers are not in
  `docker-compose.yml`.
- **The coordinator runs here**, in `docker-compose.yml`, as the admin's own service.
  It runs the key ceremony and the tally with the keypers, relays their writes and
  publishes the result. It holds no key share, and anyone can check the result it
  publishes: the UI recomputes the tally from the ballots.

How it works, and the security model, are in [README.md](README.md).

[sgp]: https://github.com/shutter-network/shutter-governance-protocol

```
sx-monorepo (docker compose)         separate projects, separate machines
  mysql        (no host port)          keyper1        :8101
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
- A browser wallet (MetaMask) with an account you control; you will vote with it
- This repo checked out. The protocol image is pulled from ghcr.

Set one variable in the terminal you will use throughout. The space SQL in step 3
uses it (step 3 adds a second one, `TOKEN`):

```bash
export MY_WALLET=0xYourWalletAddressHere   # the account in your browser wallet
```

This address becomes the space admin, which is the account allowed to retry a
stalled tally. Use an address you can sign with. The space in step 3 reads voting
power from a real ERC-20 balance, so the address must also hold some of that token.

---

## 1. Environments

There are three env files: `.env` for Snapshot and the coordinator, the UI's
`apps/ui/.env`, and, only if you run keypers yourself, one per keyper, kept with the
keyper files rather than in this repository.

### 1a. Identities (`.env`)

1. Copy the template and keep it private:
   ```bash
   cd sx-monorepo
   cp .env.example .env && chmod 600 .env
   ```
2. Replace every `0x...` with a new key: `SEQ_RELAYER_PK`, `TE_ELIGIBILITY_PRIVATE_KEY`
   and `COORDINATOR_SIGNING_KEY`. Also fill `COORDINATOR_API_TOKEN` and
   `MYSQL_ROOT_PASSWORD`. The line above each one in the file gives the command that
   creates it. In production, take the keys from your secret store instead.
3. Set `TE_RESULT_PUBLISHER_ADDRESS` to the address of `COORDINATOR_SIGNING_KEY`.
   From `apps/sequencer`, so the library resolves:
   ```bash
   bun -e 'console.log(new (require("@ethersproject/wallet").Wallet)(process.argv[1]).address)' 0x<COORDINATOR_SIGNING_KEY>
   ```
   Give the same address to every keyper operator, as their `COORDINATOR_IDENTITY`.

**The coordinator's address must match in all three places:** `COORDINATOR_SIGNING_KEY`,
`TE_RESULT_PUBLISHER_ADDRESS` and every keyper's `COORDINATOR_IDENTITY`. If they
differ, the failure shows up hours later, as an authorisation error that names neither
side, on a proposal whose ballots are already cast.

Do not change the coordinator key once private proposals exist. Every existing
proposal has its address frozen on it, and every keyper has it pinned, so a new key
breaks every election in flight.

Changing `TE_ELIGIBILITY_PRIVATE_KEY` is safe. It takes effect when the sequencer
restarts, and at that point every private proposal that has not started moves to the
new key, so its voting works normally. A proposal already open accepts no more votes,
because its credentials would no longer match the key frozen on it. Votes cast before
the change still count, and those proposals are tallied as usual.

Two values can stay as they are at first:

- **`WALLETCONNECT_PROJECT_ID`**: the template's value is fine. Only the sequencer uses
  it, to whitelist custom space domains with Reown, and only when `REOWN_SECRET` is
  set. The UI's wallet connection uses its own `VITE_WC_PROJECT_ID`.
- **`TE_SOLVER_CEILING`** starts at `1e12`, which suits roughly a 0.5 GB coordinator.
  It decides every proposal's `scale`, so set it for your hardware. See the RAM table in [Coordinator sizing](README.md#coordinator-sizing--what-a-tally-costs)
  before changing it.

In a real deployment, also set **`SEQUENCER_PUBLIC_URL`** to the sequencer's public
URL. The hub redirects `/api/scores/:id` there, and it is the *browser* that follows
the redirect to finalise a closed proposal's scores. The default,
`http://localhost:3001`, only works when the browser runs on this machine. A
container-internal name like `http://sequencer:3001` fails silently in the browser,
and every closed *public* proposal stays on "Finalizing results". Closed private
proposals are not affected: the sequencer copies their published result into the
scores on its own.

**`TE_KEYPERS` comes from the keyper operators.** Put the URLs they give you in
`.env` before creating a private proposal.

**`HUB_API_KEY` is needed only against a rate-limited hub.** A hub with
`RATE_LIMIT_DATABASE_URL` set (Snapshot's own hub is one) allows each IP 100 requests a
minute, unless the request carries a Snapshot API key. Every keyper's and the
coordinator's request reaches the hub through te-data-layer, so to the hub they all
come from one IP. A large weighted proposal needs more than 100 requests a minute at
tally time; past that the hub answers 429 and the tally stalls. Set `HUB_API_KEY` to
an API key for that hub, and te-data-layer sends it with every request. It must be an
API key issued by Snapshot for that hub
([API keys](https://docs.snapshot.box/tools/api/api-keys)): the hub checks it, and
answers every request with an unknown key with 401. The hub in this compose file has
no rate limit, so leave it unset here.

`.env.example` is the annotated reference for every variable.

### 1b. The keypers (run by other operators)

**This repo does not run keypers, and that is the security property.** Each is
operated independently, on its own machine, holding a signing key Snapshot never
sees. A committee this stack could start is a committee it could impersonate, and the
secrecy of every ballot rests on no quorum of them colluding. What you need from each
operator is a URL; what they need from you is the coordinator's address.

To run keypers yourself, for local testing or because you are also an operator, use
the keyper stack from the protocol repository. It runs the published image, so you
only need these two files, in any folder:

- [`docker-compose.keyper.yml`](https://github.com/shutter-network/shutter-governance-protocol/blob/main/deploy/docker-compose.keyper.yml): the keyper service,
  pinned to the published image
- [`.env.keyper.example`](https://github.com/shutter-network/shutter-governance-protocol/blob/main/deploy/.env.keyper.example): the template for its
  configuration

For a local committee of three, copy the template three times, to `.env.keyper1`,
`.env.keyper2` and `.env.keyper3`, and give each one its own `KEYPER_SIGNING_KEY`,
`KEYPER_PORT` (8101, 8102, 8103) and `KEYPER_STATE_DIR_HOST`. Step 2 starts them.

The variables each file asks for, and what they mean here:

| variable | value for this deployment |
| --- | --- |
| `KEYPER_SIGNING_KEY` | yours, generated by you, never shared. Its address goes to the admin |
| `COORDINATOR_IDENTITY` | the admin's coordinator address: `TE_RESULT_PUBLISHER_ADDRESS` from their `.env` |
| `SHUTTER_GOVERNANCE_PROTOCOL_API_URL` | **the translator, `http://<host>:3002`**. *Not* the example's `:8500`, which is the protocol repository's own API service |
| `COORDINATOR_URL` | the admin's coordinator, `http://<host>:8400` |
| `KEYPER_PORT` | must match this keyper's entry in the admin's `TE_KEYPERS` |
| `KEYPER_STATE_DIR_HOST` | its own directory. Two keypers sharing one overwrite each other's shares, and nothing complains until a tally cannot reach quorum. Losing it loses the keyper's share |
| `KEYPER_SECRET_TTL_S` | how long the keyper keeps a proposal's secret share after voting ends. Default 7776000 (90 days). A stalled tally that is not retried within this time can never be decrypted |

Three things about the committee that are worth knowing before you start:

- **`TE_KEYPERS` holds URLs, not addresses.** The sequencer reads each keyper's signing
  address from its `/status` and refuses two URLs that report the same address. It
  caches the result, so restart the sequencer after a keyper changes its key.
- **`TE_THRESHOLD_T` is the quorum**, the number of keypers that must act together,
  not the number of failures tolerated. It must be a strict majority: 2 of 3.
- **The URLs are dialled from inside containers**: the sequencer reads `/status`, the
  coordinator runs the ceremony, and each keyper contacts the others. So on one
  machine they are `host.docker.internal:810N`, not `localhost`.

### 1c. The UI (`sx-monorepo/apps/ui/.env`)

Private voting is off in the UI unless `VITE_TE_ENABLED=true`. Change
`VITE_TE_ENABLED=false` to `true` and add the two local URLs, leaving the other keys
as they are:

```bash
VITE_TE_ENABLED=true
VITE_LOCAL_HUB_URL=http://localhost:3000/graphql
VITE_LOCAL_SEQUENCER_URL=http://localhost:3001
VITE_ENABLED_NETWORKS=s-tn
VITE_METADATA_NETWORK=s-tn
```

The flag asks every hub the UI reads for the private-voting fields, and a hub
without this release rejects those queries, so that network's proposal pages come
up empty. Turn it on only when every hub the UI reads runs this release. The local
URLs above replace only the testnet hub, so `VITE_ENABLED_NETWORKS=s-tn` turns off
mainnet, which would still read `hub.snapshot.org`, and `VITE_METADATA_NETWORK=s-tn`
moves profiles, aliases and follows to testnet, since mainnet is no longer loaded.

Ballots are built and tallies verified in Web Workers, which load the BLST library
with `eval`. If your web server sends a Content Security Policy, its `script-src`
must allow `'unsafe-eval'`.

`VITE_MIN_DKG_LEAD_TIME_S` (default 180) must be at least the sequencer's
`MIN_DKG_LEAD_TIME_S`, or the UI offers start times the sequencer refuses. If you raise
the sequencer's, raise this one too.

Other `VITE_*` keys (Alchemy, Infura, Etherscan, WalletConnect) enable chain-data
features, such as token balances, ENS and more wallet options. None are needed here.

> **Why is there no admin private key?** The only admin action is retrying a stalled
> tally, and a **space admin** signs it in the browser. The space's admin list decides
> who may do it. A key in a file next to the coordinator's key would not separate
> authority, because both would sit on the same disk. And one configured address would
> apply to the whole deployment, letting one space's admin clear another space's
> stalled tally.

---

## 2. Start everything

Start Snapshot's services and the coordinator. The coordinator waits for the
translator's healthcheck, so one command is enough:

```bash
cd sx-monorepo
mkdir -p mysql-data
docker compose up -d --build
```

A new `mysql-data` gets the full schema on first start. **Upgrading an existing hub
database** instead: run `apps/hub/migrations/001-private-voting.sql` once, before
starting this release. Without it, private voting fails on missing columns.

If this fails with `required variable … is missing`, step 1a has not been done.
Compose refuses to start *any* service until `MYSQL_ROOT_PASSWORD`,
`COORDINATOR_SIGNING_KEY` and `COORDINATOR_API_TOKEN` are all in `.env`.

Then start the committee. In a real deployment the operators do this on their own
machines. For local testing, run this from the folder with the two files from step 1b.
Each keyper is its own compose project, so their state and containers stay separate:

```bash
for n in 1 2 3; do
  docker compose -p keyper$n -f docker-compose.keyper.yml \
    --env-file .env.keyper$n up -d
done
```

The first run builds the Snapshot image and pulls the protocol image; both are cached
afterwards. `--build` applies only to the Snapshot services. The coordinator and the keypers run a
pinned published image, so you update them by changing the tag
(`SHUTTER_GOVERNANCE_PROTOCOL_IMAGE`), not by rebuilding.

Check it came up:

```bash
docker ps --format "{{.Names}}\t{{.Status}}"            # 8 containers (see below)
curl -s localhost:8400/health                          # coordinator
curl -s localhost:8101/status | python3 -m json.tool   # and 8102, 8103
curl -s localhost:3002/elections                       # {"electionIds":[]}
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/graphql   # 400 is correct
```

`mysql`, `hub` and `te-data-layer` should show "healthy". The sequencer and the
coordinator have no healthcheck, so they show "Up". Keypers can show "starting" for up
to two minutes, because their healthcheck runs every 120 seconds.

Each keyper's `/status` should report its own `address`.

On a first run they will all say **`"bootstrapped": false`, and that is correct.**
A keyper is bootstrapped when the coordinator installs its tokens over
`/auth/bootstrap`, and the coordinator only does that when it has an election to run
a ceremony for. So the flag stays false until you create your first private
proposal. It is persisted from then on, so after a restart with its state directory
intact a keyper reports `true` immediately. `false` on a keyper that has already
taken part in an election means its state was lost.

A bare GET on `/graphql` answering `400` is correct: the request has no query.

**To stop everything, keeping all data:**

```bash
# keypers, if you run them locally: from their own folder
for n in 1 2 3; do
  docker compose -p keyper$n -f docker-compose.keyper.yml \
    --env-file .env.keyper$n stop
done
docker compose stop
```

`stop`, not `down`: MySQL's data and each keyper's encrypted shares survive, so the
next start resumes the same elections.

**For a clean slate**, run `docker compose down && rm -rf mysql-data coordinator-state`
here and delete each keyper's state directory. MySQL's data and the coordinator's
keyper tokens are folders (bind mounts, not volumes), so `down -v` does not remove them. A wipe cannot be undone: the
ballots are encrypted under per-election keys, and without the shares no
undecrypted tally can ever be recovered. The schemas are loaded again on the next
start.

**After changing application code**, rebuild: `docker compose build && docker
compose up -d`. `up` does not rebuild the image, so without the build the containers
keep running the old code and a fix looks deployed when it is not.

**If a host port is already in use**, override only that one, for example
`HUB_PORT=3010 docker compose up -d`. The overridable ports are `HUB_PORT`,
`SEQ_PORT`, `TE_DATA_LAYER_PORT` and `COORDINATOR_PORT`. Containers always reach each
other on the fixed internal ports.

---

## 3. Get a space to propose in

A fresh database has no space, so there is nothing to propose in yet. Two ways to
fix that:

- **Create one from the UI** once step 4 is running. This is the normal Snapshot flow;
  use it to test space creation as a user would.
- **Seed one directly in the database**, below. Faster, repeatable, and it lets you
  pin the exact strategy you want to test rather than filling in a form.

The rest of this section is the second option. It is three separate inserts, and
each one is needed for a different reason. They, and the checks in later steps, pass
MySQL's root password from `.env` into the container:

```bash
cd sx-monorepo
export MYSQL_PWD=$(grep '^MYSQL_ROOT_PASSWORD=' .env | cut -d= -f2)
```

### 3a. Mark Sepolia as premium

The sequencer refuses proposals from a network that is not marked premium, so this
must exist before any space can be used.

```bash
docker exec -i -e MYSQL_PWD sx-monorepo-mysql-1 mysql -uroot -h127.0.0.1 snapshot_hub <<'EOF'
INSERT IGNORE INTO networks (id, name, testnet, premium)
VALUES ('11155111', 'Sepolia', 1, 1);
EOF
```

### 3b. Insert the space

Voting power here is a **real ERC-20 balance** read from Sepolia, which is what a
private proposal exercises properly: the sequencer reads the token's `totalSupply()`
to size the tally, and each voter's weight is their own balance.

Two fields decide whether this works:

- **`address`** is the token. The one below is a Sepolia test token; substitute your
  own if you have one, and make sure the wallets you intend to vote with hold a
  balance of it. **A wallet holding none has no voting power and cannot vote.**
- **`decimals`** must match the token. This one is 6. Passing 18 divides every
  balance by 10^12 without any error, so a real holder looks like dust and is refused
  with "voting power too low". Because nothing fails, this is slow to debug.

```bash
export TOKEN=0xabc...   # Sepolia test ERC-20

docker exec -i -e MYSQL_PWD sx-monorepo-mysql-1 mysql -uroot -h127.0.0.1 snapshot_hub <<EOF
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
JSON_OBJECT('symbol','TST','value',100)))`. The `ticket` strategy gives every wallet the
same fixed power, so any account can vote. It is not a token strategy, so the sequencer
cannot read a supply from it and falls back to a derived bound; see
[Weight scaling](README.md#weight-scaling--the-units-a-proposal-counts-in).

### 3c. Set the proposal limits

A fresh database has no rows in `options`, and every missing limit counts as 0. So
without this step every proposal is refused, with an error about limits.

```bash
docker exec -i -e MYSQL_PWD sx-monorepo-mysql-1 mysql -uroot -h127.0.0.1 snapshot_hub <<'EOF'
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

## 5. Create a proposal and watch the DKG

In the UI: **New proposal**. Then, before you submit:

- **Privacy → Permanent private voting.** This is the whole point; without it you
  get an ordinary public proposal and none of the machinery below runs.
- **Voting type → Weighted.** Any type works; with weighted you spread 100 points
  across the choices.
- **Start time at least 3 minutes out** (`MIN_DKG_LEAD_TIME_S`). The committee must
  create the election key *before* voting opens. If voting opens without a key, the
  proposal fails for good and cannot be retried. The editor sets the start to at least
  4 minutes out (3 minutes plus 1 minute for signing); do not move it earlier.
- To make a public proposal private later, create it with a start well ahead, about
  10 minutes. An edit cannot change the start time, and the 3-minute rule applies to
  the stored start.

Submit, then watch the ceremony:

```bash
docker logs -f sx-monorepo-coordinator-1
```

Within about 30 seconds (the coordinator's poll interval) you should see:

```
op=dkg status=starting election=... committee=3 attempt=1
op=bootstrap status=ok committee=3
op=dkg phase=round1 status=ok election=... keypers=3
op=dkg phase=distribute_commitments status=ok election=... keypers=3
op=dkg phase=distribute_shares status=ok election=... keypers=3
op=dkg phase=round2 status=ok election=... keypers=3 complaining=0
op=dkg phase=publish status=ok election=... published=3/3
op=dkg status=finalized election=...
```

`complaining=0` matters. A complaint means a keyper rejected another keyper's share,
and the coordinator then asks for that share again. If the complaint remains, the key
is published without the complaining keyper (`status=finalized_degraded`, so no spare
keyper remains for the tally), or the ceremony stops (`status=halted_complaint`).

Confirm the key landed:

```bash
docker exec -e MYSQL_PWD sx-monorepo-mysql-1 mysql -uroot -h127.0.0.1 snapshot_hub \
  -e "SELECT title, te_mpk IS NOT NULL AS has_key FROM proposals ORDER BY created DESC LIMIT 1;"
```

The proposal page also shows the committee and key once this completes.

---

## 6. Vote

When the start time passes, vote in the UI. On a weighted proposal you distribute
100 points across the choices.

Your browser encrypts the ballot under the election key and proves, in zero
knowledge, that it is well formed and adds up to the budget, without revealing the
split. What reaches the server is ciphertext. No single party, including the hub, can
read an individual ballot; only a quorum of keypers working together could.

Check it was stored encrypted:

```bash
docker exec -e MYSQL_PWD sx-monorepo-mysql-1 mysql -uroot -h127.0.0.1 snapshot_hub \
  -e "SELECT voter, vp, LEFT(choice, 80) AS ciphertext FROM votes ORDER BY created DESC LIMIT 1\G"
```

---

## 7. Wait for voting to end (the tally runs on its own)

Nothing to press. Past the end time, the coordinator drives two phases; watch:

```bash
docker logs -f sx-monorepo-coordinator-1
```

```
op=tally status=aggregating   ← every keyper re-derives the weighted sum independently
op=tally status=decrypting    ← a quorum agreed byte-for-byte; now they decrypt it
op=tally status=finalized
```

Between the first two lines, each keyper computes the aggregate from the same ballots
on its own, and the aggregate counts only when a quorum submits identical bytes.

Allow a minute or two: the coordinator polls every 30 seconds.

---

## 8. The result

Refresh the proposal page. Scores are shown, and the **Permanent private tally**
panel appears with a **Verify tally** button. Press it: your browser re-downloads
every encrypted ballot and every decryption share, recomputes the aggregate,
re-checks each keyper's proof, and compares the total to what was published. You
do not have to trust the server's number, because you recompute it.

From the command line:

```bash
docker exec -e MYSQL_PWD sx-monorepo-mysql-1 mysql -uroot -h127.0.0.1 snapshot_hub -e \
  "SELECT p.title, p.scores_state, p.scores, r.totals_json, r.keyper_indices
     FROM proposals p LEFT JOIN te_results r ON r.proposal_id = p.id
    ORDER BY p.created DESC LIMIT 1\G"
```

```
scores_state: final
      scores: [7.62, 1.79, 1.59]
 totals_json: ["762","179","159"]     ← raw, before dividing by the budget
keyper_indices: [1,2]                 ← the two shares used to recover the totals
```

`scores` is `totals_json x scale / budget` (here budget 100 and scale 1).
`keyper_indices` lists the two shares the totals were recovered from. That is the
threshold working: a third share was not needed, even if that keyper sent one.

---

## If something stalls

A tally the committee cannot finish is marked **stalled** and stops retrying. This is
on purpose: a stuck election waits for a person instead of retrying forever. The
proposal page shows a red notice, and because your wallet is the admin, a **Retry
tally** button.

Bring the keypers back *first*, then retry. Retrying while they are down only stalls
again:

```bash
docker ps --format "{{.Names}}\t{{.Status}}" | grep keyper

# Restart any that are down (safe to run for all three). Locally-run keypers only;
# otherwise this is the operators' job and you ask them.
for n in 1 2 3; do
  docker compose -p keyper$n -f docker-compose.keyper.yml \
    --env-file .env.keyper$n up -d
done
curl -s localhost:8101/status | python3 -m json.tool
```

The notice lists three possible causes. It can also show a reason from the
coordinator, but the 0.1.0 coordinator does not send one. The coordinator's log has
the details:

```bash
docker logs sx-monorepo-coordinator-1 2>&1 | grep abandoned
```

## Other things that go wrong

| Symptom | Cause |
|---|---|
| `proposal does not yet have a finalised threshold key` | the page was loaded before the key existed (reload it), or the DKG failed (next row) |
| Proposal never gets a key, log says `voting_start passed without a key` | permanent: the key ceremony did not finish before voting opened. Create a new proposal |
| `Retry tally` missing on a stalled proposal | the connected wallet is not an admin of the proposal's space (step 3 sets that list) |
| Keypers unreachable | check that each keyper's `KEYPER_PORT` matches its URL in `TE_KEYPERS` and is published on the host |
| UI shows no space | step 3 did not run, or you are on the wrong URL. It must use the `s-tn:` prefix |
| Closed public proposal stuck on "Finalizing results" | the browser cannot reach `SEQUENCER_PUBLIC_URL` (step 1a). `curl -sL localhost:3000/api/scores/<id>` should return `{"result":true}` |
| `TE_KEYPERS entry "…" looks like "address@url"` | `TE_KEYPERS` takes URLs only; addresses are read from each keyper's `/status` |
| Committee writes rejected as `not_a_registered_keyper` | the signer is not in the proposal's frozen committee, usually because a keyper changed its key after the proposal was created. The frozen committee never changes |
| A fix you made does not take effect | the image was not rebuilt; see "After changing application code" in step 2 |

## Where to read more

The design, security model and sizing are in [README.md](README.md). For the code,
start with these files:

| File | Covers |
|---|---|
| `apps/sequencer/src/helpers/teCommittee.ts` | how a committee is resolved from URLs and frozen onto a proposal |
| `apps/hub/src/helpers/sgpDigests.ts` | the digests keypers and role keys sign their writes over, which must match the protocol byte for byte |
| `apps/hub/src/te.ts` | the public, read-only audit routes |
| `apps/sequencer/src/helpers/teTallyScheduler.ts` | how published tallies are copied into the scores of closed private proposals |
| `apps/sequencer/src/writer/delete-proposal.ts` | deleting a private proposal, and the committee artifacts deleted with it |
| `apps/ui/src/helpers/sgpRequest.ts` | the digest the admin's retry is signed over |

For the protocol itself (the coordinator, the keypers and the data-layer contract this
repository implements), see the source in the shutter-governance-protocol repository.
You do not need it to run any of the above; it is the reference for what the published
image does.
