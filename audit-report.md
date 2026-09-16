# geg Integration — Security & Plan-Conformance Audit

## Executive summary

The `feat/generalised-el-gamal-integration` branch replaces sx-monorepo's in-repo threshold-ElGamal machinery (Python keyper fleet, sequencer-side aggregation and tally recovery) with the `generalised-el-gamal` protocol stack, using the Snapshot hub as the data layer. The implementation is substantially complete and, on the whole, faithful to `geg-integration-plan.md`: Gate 0 (published SDK + vendored vector corpus), the frozen config write, attestation minting, the committee-owned aggregate quorum, the share/result/stall write paths, the stateless translator, the scores mirror, and the D14 public-path gating are all present and mostly well-tested.

Two classes of problem stand out. First, **one deliberate design reversal re-opens a security property the plan explicitly named as closed**: keyper committee addresses are now discovered from each keyper's `/status` rather than configured explicitly, which is exactly the F4 member-list MITM the plan's `TE_KEYPERS=addr@url` format existed to prevent — and `docker-compose.yml` still carries the old comment claiming the opposite. Second, **several plan acceptance criteria that guard correctness were not delivered**: there is no test at all for `te_geg_ballots` (the R5 single-materialization invariant), no golden legacy-equivalence fixture corpus (R7), and geg's own conformance suite is not wired against the translator — the plan called that last one "the single highest-value test in the plan."

Beyond those, the audit found a replayable stall/resume authorization, an unbounded per-request signing cost on a public hub endpoint, and a config-drift path that silently zeroes a tally.

---

## Scope

| | |
|---|---|
| Repository | `sx-monorepo` |
| Branch | `feat/generalised-el-gamal-integration` |
| Base | `master` |
| Head commit | `fb4bc1be` |
| Diff | 225 files, +12,254 / −19,929 |
| Languages | TypeScript (Node/Bun, Express, Vue 3), SQL, some Python (verification scripts only) |
| Reference docs | `geg-integration-plan.md`, `geg-integration-issues.md` |

Components reviewed in depth:

- `apps/hub/src/geg.ts` — the data-layer read/write router (1,453 LOC, new)
- `apps/hub/src/helpers/{gegConfig,gegDigests,gegAttestation,bigIntJson}.ts`
- `apps/hub/src/te.ts` — legacy audit surface (reduced from 681 → 184 LOC)
- `apps/te-data-layer/**` — the stateless translator (new service)
- `apps/sequencer/src/helpers/{teCommittee,teEligibility,te,teTallyScheduler}.ts`
- `apps/sequencer/src/writer/{proposal,update-proposal,delete-proposal,vote}.ts`
- `apps/sequencer/src/scores.ts` — the scores mirror
- `apps/ui/src/helpers/{teVerify,teStall,gegRequest,constants}.ts`, `TeTallyStalledNotice.vue`
- `packages/geg-parity/**` — Gate 0 vector corpus
- `apps/hub/src/helpers/schema.sql`, `docker-compose.yml`, `.env.example`

Trust boundaries: the hub is publicly reachable and holds `TE_ELIGIBILITY_PRIVATE_KEY`; the translator is keyless, stateless, and must be reachable from every keyper operator; the coordinator holds `resultPublisherKey`; each keyper holds its own signing key and secret share off-hub.

**Tooling caveat:** `semgrep`, `gitleaks`, `gosec`, and `bandit` are not installed in this environment, so Phase 2 automated SAST could not be run. A manual scan for hardcoded key material across the diff found none (and the branch is a net improvement here — `docker-compose.yml` no longer bakes publicly-known dev keyper keys). All findings below come from manual review.

---

## Severity summary

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 2 |
| Medium | 5 |
| Low | 5 |
| Informational | 4 |

---

## High

### H-1 — Keyper committee addresses are discovered from `/status`, re-opening the F4 member-list MITM the plan closed [NOT TBD]

**File:** `apps/sequencer/src/helpers/teCommittee.ts:136-247`

The plan is unambiguous (§5.2, and the trust-model table in §12):

```bash
# Addresses are EXPLICIT, never discovered from keyper /status.
# That is precisely what closes F4 (member-list MITM) in architecture.md §5.
TE_KEYPERS=0xAAA…@https://k1.example.com,0xBBB…@https://k2…,0xCCC…@https://k3…
```

| DKG member MITM (F4) | Today: ❌ addresses discovered from `/status` | After: ✅ closed |

The implementation does the opposite. `parseKeypers` **actively rejects** the plan's format:

```ts
if (entry.includes('@')) {
  throw new TeConfigError(
    `TE_KEYPERS entry "${entry}" looks like "address@url"; it takes URLs only. ` +
      `Each keyper's address is read from its /status.`
  );
}
```

and `resolveCommittee` then takes whatever address each endpoint reports and writes it into the frozen `te_geg_config` committee list, which is the sole authority for hub's write authorization (`geg.ts:461`, `690`, `998`).

`docker-compose.yml:120` still carries the *original* comment, now false, directly above the variable:

```yaml
# The committee, frozen onto each private proposal as it is created. Addresses
# are configured explicitly and never discovered from a keyper's own /status —
# discovery let a network attacker substitute an address mid-ceremony.
TE_KEYPERS: "${TE_KEYPERS:-}"
```

**Failure scenario.** An attacker with a network position on the sequencer→keyper path (or DNS/BGP control, or a plain `http://` URL — `parseKeypers:150` explicitly allows `http`) answers the `/status` probes with addresses it controls. The distinctness check (`resolveCommittee:230-240`) is satisfied as long as the substituted addresses differ from each other, so substituting *all three* passes cleanly. The resulting committee is frozen onto every subsequent private proposal, and because the result is cached against the `TE_KEYPERS` string for the process lifetime (`committeeCache`, line 182), a single successful interception at the first private proposal after boot poisons every private proposal until the sequencer restarts. The attacker's committee then runs the DKG, so it can decrypt every individual ballot (privacy break) and produce any aggregate it likes at quorum.

Substituting a *subset* is enough to reach quorum too: with `t = 2, n = 3` the attacker needs two slots.

**Recommendation.** Restore the plan's `address@url` format as the authority, and treat `/status` as a *check* rather than a source: fetch it, and refuse to freeze the committee if the reported address does not match the configured one. That keeps the operational convenience (a misconfigured keyper still fails loudly at creation) without making the network the source of truth. If discovery must stay, at minimum require `https://` and pin the expected addresses; and fix the contradictory `docker-compose.yml` comment either way.

---

### H-2 — `GET /api/proposal/:id/te_geg_ballots` performs unbounded synchronous BLS signing per request on the shared hub process [DONE]

**File:** `apps/hub/src/geg.ts:208-359`; `apps/hub/src/helpers/gegAttestation.ts:209-226`

The endpoint is public, unauthenticated (correctly — geg's data layer is trusted for availability only), and mints one fresh Schnorr-G1 signature **per ballot, per request**, inside the Express request path via synchronous WASM:

```ts
for (const { seq, row, weight, envelope } of page) {
  signature = await mintAttestation({ ... });   // blst WASM sign
```

Nothing bounds the page: `count` is only honoured when `> 0`, and `rawCount <= 0` falls through to `emitted.slice(start)` — the **whole election**. There is no per-route rate limit, no cost cap, and no cache (signatures are freshly randomized each call, so they are not cacheable).

The repository's own benchmark (`apps/hub/benchmarks/attestation-mint-scale.ts`) defaults to `N_MINT=30000`, which is the scale the authors expect. At that size one request costs tens of seconds of blocking CPU on the hub — the same process that serves all of Snapshot's GraphQL and REST API.

The global limiter is not a mitigation:

- `apps/hub/src/helpers/rateLimit.ts:31` — `skip: (req) => { if (!client?.isReady) return true; ... }`, so rate limiting is **entirely disabled** when `RATE_LIMIT_DATABASE_URL` is unset — which is exactly what the shipped `docker-compose.yml:76` does (`RATE_LIMIT_DATABASE_URL: ""`).
- Even when enabled, the limit is 100 req/min/IP, and each of those 100 requests can carry O(N) signing work.

**Failure scenario.** Attacker finds any `shutter-elgamal` proposal with a large electorate (or seeds one), then issues `GET /api/proposal/<id>/te_geg_ballots` in a loop with no `count`. Hub's event loop is saturated; GraphQL, vote ingest reads, and the keypers' own legitimate reads all stall. The blst WASM heap is fixed at 16 MB, so at sufficient scale the process aborts rather than degrades (the benchmark's own header notes this).

**Recommendation.** Cap `count` server-side (reject or clamp above e.g. 500) and require pagination above a threshold; move minting off the request thread or memoize per `(proposalId, sequenceNumber, weight, nonce)` for the life of the row (the signature is over immutable inputs once voting closes); apply a dedicated, stricter limiter to the `geg` router independent of `RATE_LIMIT_DATABASE_URL` being configured.

---

## Medium

### M-1 — `tally_stall` / `tally_resume` signatures are replayable indefinitely [DONE]

**File:** `apps/hub/src/geg.ts:1359-1422`; `apps/hub/src/helpers/gegDigests.ts:343-365`

The stall/resume digest binds only the operation name and the election id:

```ts
signer = recoverDigestSigner(requestDigest(op, proposalId), sig);
```

`requestDigest('tally_stall', eid)` has no nonce, no timestamp, no state-dependent term, and the hub does not record consumed signatures. Any party that observes one valid `tally_stall` signature can replay it forever.

**Failure scenario.** A private proposal stalls once legitimately. The coordinator's `tally_stall` signature transits the translator (which is keyless and logs, and by design is operated as a separate, internet-reachable service) — so a translator operator, a network observer, or anyone who can read the request is in possession of it. Each time a space admin signs `tally_resume` and the scheduler resumes polling, the attacker replays the captured stall. `teTallyScheduler.selectTallyCandidates` filters on `te_tally_stalled = 0`, so the tally never completes and `scores_state` never reaches `final`. This is a permanent, cheap, unattributable denial of the proposal's result — the exact "in-flight confidential tally destroyed" outcome §12 says the design is trying to bound.

The same applies to `tally_resume` in the other direction, though the impact there is smaller.

Note this weakness is inherited from the plan's own digest specification (§7.2), so it is a design gap rather than a deviation — but it is exploitable as built.

**Recommendation.** Bind mutable state into the digest so a signature is single-use: include the current `te_tally_stalled` value plus a monotonic per-proposal counter (or `posted_at`) in the payload, persist the last accepted counter, and reject a replay. If the digest cannot change (geg compatibility), persist consumed signatures per `(proposalId, op)` and reject duplicates.

#### Fixed — a signed timestamp, spent once

`requestDigest` already accepted a payload; the stall route simply passed none. It now carries **eight bytes, big-endian, unsigned seconds**, and a verifier accepts it only if it is within ±300s *and* has not been used before.

Two defences, doing different jobs. Freshness alone leaves a 300-second replay hole; the nonce alone would grow without bound. Together the timestamp makes the nonce store **finite** and the nonce makes each signature **single-use**.

| where | what |
| --- | --- |
| `geg/core/authz.py` | `request_nonce_payload`, `request_is_fresh`, `REQUEST_FRESHNESS_S` |
| `apps/hub/src/helpers/gegDigests.ts` | `requestNoncePayload` |
| `apps/ui/src/helpers/gegRequest.ts` | `requestNoncePayload` — the admin signs the retry in a wallet |
| `apps/hub` · `te_request_nonces` | `PRIMARY KEY (proposal_id, op, issued_at)`; pruned outside the window |
| `geg` · `request_nonces` | same key, `ON CONFLICT DO NOTHING` |

The primary key *is* the check, so two concurrent replays cannot both pass a read-then-write race.

**Scope was wider than the two files named.** Following the op through, the signing and verifying paths also cover geg's admin service (`retry_tally` and its `/tally/retry` route), the memory / Postgres / chain adapters, the data-layer service route, the coordinator, and the browser. Fixing only `geg.ts` and `gegDigests.ts` would have left the admin retry path replayable.

#### Why the recommended approach was not taken

**The fallback option is unworkable, and would have caused an outage.** The recommendation offers, if the digest cannot change, persisting consumed signatures and rejecting duplicates. `Account.sign_message` and `signMessage` are **RFC 6979 deterministic** — verified directly, `sig1 === sig2` for the same message. A genuine *second* stall of the same proposal is therefore byte-identical to a replay. Deduplicating signature bytes would make re-stalling impossible: a proposal that stalls, is retried, and stalls again could never be marked, and the coordinator would spin against it forever.

This also rules out any hub-only fix. The bytes are identical, so nothing the verifier can inspect distinguishes an honest re-stall from a replay. The signature has to carry something fresh, which means the signer must participate — so geg changed too.

**A timestamp was preferred over the monotonic counter.** The counter is sound, but the signer has to learn the current value before signing, which means exposing it in the read contract and adding a round-trip to every stall. A timestamp needs only the signer's own clock and bounds the attack just as well: the replay that does damage is the *later* one, after an admin retry, and freshness makes exactly that impossible. A replay inside the window is a no-op — the proposal is legitimately stalled at that moment anyway — and the nonce refuses it regardless.

**Binding `te_tally_stalled` alone would not have worked**, which is worth recording since the recommendation suggests it as one half. The flag returns to its previous value after a retry, so a stall signature bound to `stalled = 0` becomes valid again the moment an admin resumes — precisely the attack.

#### Verification

- geg: **502 passing** (from 486 / 12 failing), plus **38 Postgres conformance tests that had been silently skipping** — `TestPostgresConformance` skips the whole module when the database is unreachable, so `store.py` had no coverage until a Postgres instance was started for it.
- `test_tally_stall_signature_cannot_be_replayed`, run against every backend: stall → retry → replay inside the window → **rejected**; then a fresh re-stall → **accepted**. Mutation-checked on both the memory and Postgres paths.
- Cross-language parity: `packages/geg-parity/vectors/request-nonce.json`, generated from geg's Python, asserted by both TypeScript copies. Four implementations of one encoding; a byte of drift would surface as `not_the_admin`, which reads like the wrong wallet rather than an encoding bug.
- **Live, on proposal `0x8cab44fb…`:** the coordinator stalled (`issuedAt 1787305788`), an admin retried, and the captured signature was replayed 118 seconds later — well inside the freshness window — and refused with `409 this request has already been used`; the tally stayed resumed. Freshness alone would not have stopped it. A fresh coordinator stall immediately afterwards was accepted.

---

### M-2 — `ballotParamsColumn` reads live `TE_WEIGHTED_BUDGET` instead of the proposal's frozen snapshot, allowing a silent all-zeros tally [DONE]

**File:** `apps/sequencer/src/helpers/teCommittee.ts:388-406`; used at `writer/update-proposal.ts:174-179`

`te_geg_config.weightedBudget` is frozen at creation, and the hub derives the committee-facing `budget` from it (`gegConfig.ts:114`, `geg.ts:268-272`). But the ingest-facing `te_config` column is rebuilt from **live env** on every update:

```ts
export function ballotParamsColumn(choices, type, env = readTeEnv()) {
    const weightedBudget = requireInt(env.weightedBudget, 'TE_WEIGHTED_BUDGET', 100);
  return { te_config: JSON.stringify({ ..., budget: type === 'weighted' ? weightedBudget : 1, ... }) };
}
```

**Failure scenario.** A weighted private proposal is created at `TE_WEIGHTED_BUDGET=100`. An operator changes the env to `50` and restarts the sequencer. The author edits the proposal (any edit — title, body, choices) before `start`. `update-proposal.action()` rewrites `te_config.budget = 50`, but `te_geg_config.weightedBudget` stays `100`. The browser now builds ballots summing to 50 (`teBallot.ts:197`, reading `te_config`), the sequencer verifies them against 50, and the committee admits against a config advertising `budget: 100` — so every ballot fails `admit()` as `INVALID_PROOF`. The published tally is all zeros with no error anywhere in the chain. This is precisely the failure shape §5.6 identifies as "the worst available", applied to the wrong field.

The R1 fix in §5.4 is otherwise correctly implemented; the defect is only in the *source* of `weightedBudget`.

**Recommendation.** `ballotParamsColumn` should take the budget from the proposal's `te_geg_config.weightedBudget`, never from env. Env should be read only inside `buildCommitteeSnapshot`. Add an assertion in hub's `te_geg_election` that `te_config.budget === derived budget` and 500 loudly on mismatch, matching the eligibility-key belt in §5.6.

---

#### Fixed — the budget has one source, and it is the frozen snapshot

Implemented as recommended, both halves.

**The environment is no longer readable from this path.** `ballotParamsColumn` takes the budget as a **required parameter** rather than defaulting it from `readTeEnv()`. That distinction carries the fix: a default would let a future caller reintroduce the env read silently, whereas a required parameter makes omitting it a compile error.

| call site | budget from |
| --- | --- |
| `writer/proposal.ts` | the `TeCommitteeSnapshot` it just built — both columns now come from one value |
| `writer/update-proposal.ts` | `frozenWeightedBudget(existing.te_geg_config)` |
| `writer/update-proposal.ts`, public→private | the snapshot written in that same call |

`frozenWeightedBudget` **throws rather than defaulting** on a missing or malformed budget, for the same reason: a fallback here is the bug.

**The hub-side belt is in.** `te_geg_election` compares `te_config.budget` against the budget it advertises to the committee and returns `500` naming both values on mismatch. Once the source is single this cannot fire — which is the point of asserting it, exactly as with the eligibility-key guard. Refusing to serve the config is recoverable; a plausible all-zeros tally is not.

#### One correction to the finding

The failure is not quite invisible. Ballots rejected by the committee land in the aggregate's **`exclusions` list as `INVALID_PROOF`**, and that list is signed and published — so the audit surface does record what happened.

It cuts both ways. Diagnostically it is recoverable: anyone opening the verify panel sees every ballot excluded, with a reason. Operationally the finding's conclusion still holds, because `scores_state` reaches `final`, the UI shows an unremarkable zero result, and nobody opens the panel on a result that looks ordinary. And while **M-4** stands, the panel would report "does not match" — reading as tampering rather than as configuration drift.

So: better than "no trace anywhere", worse than "detected". The severity is unchanged.

#### Verification

`test/integration/writer/update-proposal-budget.test.ts` — seeds a private proposal created at budget 100, changes `TE_WEIGHTED_BUDGET` to 50, runs a real title edit through `action()`, and asserts the stored budget is still 100. Also covers the environment being unset entirely, and that the rest of the edit still applies (the budget is pinned, not the proposal).

Mutation-checked against the pre-fix code — restoring both the env default and the argument-less call site fails it with `Expected: 100, Received: 50`, the exact drift described above.

Worth recording how that test was arrived at: the first attempt asserted on `ballotParamsColumn` directly and **passed against the mutated code**, because the defect lived at the call site rather than in the helper. A test covering the right function that cannot fail for the right reason is worse than no test, since it reads as coverage. The replacement drives the real writer.

Suites after the change: sequencer 247 passing, hub 90 passing, lint clean in both.

### M-3 — Hub's global rate limit will throttle the coordinator and keypers, converting normal operation into spurious stalls [DONE — severity reduced; documented, with the symptom made self-diagnosing]

**File:** `apps/hub/src/helpers/rateLimit.ts:25-32`; `apps/hub/src/index.ts:51`

Every geg route is mounted behind the shared `rateLimit` middleware (100 req/min, keyed on hashed client IP). All keyper and coordinator traffic reaches the hub through the translator, so it presents as **one IP**. With the plan's `COORDINATOR_POLL_S=2.0`, a single tick costs `list_elections` + one `get_election` per active election; the coordinator alone produces ≥30 req/min at one election and ≥90 at two, before any keyper reads `list_ballots`/`get_aggregate`/`get_shares`.

**Failure scenario.** Two concurrent private proposals push the translator over 100 req/min. Hub answers 429. The translator faithfully passes 429 through (`hub.ts:83-91`), which geg's client does not map to any of its typed exceptions, so the coordinator sees a generic error. Per §11 H18 the coordinator burns an attempt **per poll cycle** that fails to reach quorum, so a busy-but-healthy deployment exhausts its 5-attempt budget and marks the tally stalled — the "benign slowness stalls the same way Byzantine disagreement does" hazard, triggered by the hub's own limiter rather than by election size.

**Recommendation.** Exempt the `geg` router from the public limiter, or give it its own generous limiter keyed on something other than the translator's IP (e.g. a shared secret between translator and hub, which does not break the "keyless translator" property — it authenticates a transport, not an artifact). Document the required limit alongside `COORDINATOR_POLL_S` sizing, which Issue 7's HITL criterion asks for and which is not recorded anywhere in the branch.

---

#### Severity reduced: the arithmetic used a development poll interval

The finding computes load at `COORDINATOR_POLL_S=2.0`. The deployed value is **30** — in `deploy/.env.coordinator` and in `RUNNING.md`. The `2.0` was a development leftover in the compose default and has since been corrected there too.

| | at 2s (as filed) | at 30s (deployed) |
| --- | --- | --- |
| 1 active election | ~30 req/min | **4 req/min** |
| 2 active elections | ~90 req/min | **6 req/min** |
| 20 active elections | — | **42 req/min** |

A 15× reduction against a 100 req/min budget, so the headline scenario — two concurrent proposals exceeding the limit — does not arise. What remains is the tally burst: with the page cap added for H-2, a 3,000-ballot election is `1 count + 3 pages` per keyper, about 12 requests across a committee of three; 10,000 ballots is about 33. Still inside budget unless several large elections tally within the same minute.

#### Mechanism correction

The finding attributes the stall to the coordinator burning an attempt per failed poll. It does not: an exception from the data layer is caught in `scan_once` **outside** the attempt counter, and `att["agg"] += 1` sits deeper inside `_drive_tally`, past two `get_aggregate()` calls that would already have thrown.

The real chain runs through the keypers, which share the translator's IP and therefore its budget:

1. a throttled keyper's ballot read fails, so it cannot produce an aggregate;
2. it reports `failed` to the coordinator's trigger;
3. `failed` is neither `submitted` nor `started`, so it falls to the unreachable branch and **does** increment the attempt;
4. after `max_tally_attempts`, the tally is marked stalled with reason `unreachable`.

Same conclusion, different cause — and it matters, because it identifies the **keyper read path** as what needs exempting, not the coordinator's polling.

#### Resolution: documented, because the limiter is not ours to configure

Hub and sequencer are not deployed from this repository (see `DEPLOYMENT-ALIGNMENT.md` §W5), so the limiter's configuration belongs to whoever operates them. The sizing above is documented for them rather than enforced here.

Note also that "whitelist the services" cannot mean exempting the `geg` router wholesale: **H-2** in this same report is that the ballot feed is an unauthenticated read, and a blanket exemption removes a mitigation for it. The correct shape is a separate, generous limiter keyed on a shared translator↔hub secret — which is also the authentication H-2 leaves open, so one mechanism serves both.

#### What was changed in code, because it is ours

Configuration cannot be enforced from here, but **diagnosability can**. A 429 was logged at `warn`, indistinguishable from a 400 or a 404 — while presenting to an operator as a stalled tally blaming the keypers, who are healthy. `te-data-layer`'s `logUpstream` now gives 429 its own branch at error level, naming the cause, the symptom it will produce, and the remedy:

> the hub rate-limited this request. All keyper and coordinator traffic shares this service's IP, so a throttled read makes keypers fail to aggregate and the tally stalls reporting "unreachable". Raise the hub's limit for this service, or exempt it.

This is the part documentation cannot cover: a sizing note only helps someone who is already looking in the right place, and the failure's defining property is that they will not be.

Two tests pin it — that a 429 logs at error with cause, consequence and remedy, and that an ordinary 4xx stays at `warn` so the distinction survives. Mutation-checked: removing the branch fails the first. Suite 78 passing.

The limiter is inert without Redis (`RATE_LIMIT_DATABASE_URL`), so this cannot fire in a default local stack — which is exactly why it had to be unmistakable when it does.

### M-4 — The audit panel recomputes the aggregate over *all* ballots and ignores the committee's exclusions, so a legitimate tally can display as a verification failure [DONE — plus an ordering gap the finding does not mention, which had to close first]

**File:** `apps/ui/src/helpers/teVerify.ts:209-278`; `apps/hub/src/te.ts:147-182`

`aggregateBallots()` sums every non-dust ballot returned by `GET /te_ballots` and compares byte-for-byte against the published aggregate. But the published aggregate is a sum over the committee's `admitted` set only, with a typed `exclusions` list beside it (`geg.ts:590-610`). `/te_ballots` returns neither, and the UI never reads them.

**Failure scenario.** Any single excluded ballot — `INVALID_ATTESTATION`, `OUT_OF_WINDOW` at the half-open boundary, `MALFORMED` — makes `aggregateMatches` false. The verify panel then tells voters the published tally does not match the ballots, on an election that is entirely correct. Given the whole point of §12's "aggregate integrity" row is that the audit surface is now the thing that catches a dishonest committee, a check that cries wolf on healthy elections is worse than no check: it trains operators to ignore it.

**Recommendation.** Serve the canonical aggregate's `admitted` and `exclusions` from `/te_ballots` (or have the panel read `/te_geg_aggregate`), restrict the recomputation to the admitted sequence numbers, and surface the exclusion list to the user as a separate, expected-to-be-non-empty section. The sequence numbering already exists in `te_geg_ballots`; `/te_ballots` needs the same materialization so the two agree.

#### A prerequisite the finding does not name: the two endpoints disagreed on order

`te_geg_ballots` orders by `created ASC, id ASC`; `te_ballots` ordered by
`created ASC` alone. `created` is a second-resolution timestamp and not a total
order, so two ballots cast in the same second could come back either way round —
and MySQL is under no obligation to be consistent between the two queries or
between two calls of one. Sequence number 3 could mean different ballots to the
committee and to the panel.

Mapping `admitted`/`exclusions` onto ballots is meaningless until that closes, so
it closed first. `te_ballots` now carries the same `ORDER BY`, under the same
`cb != -3` filter, over the same rows.

Pinned by `test/e2e/te-ballots-ordering.test.ts` (4 tests): the two endpoints
return the same ballots in the same positions, they renumber in step when a vote
is soft-deleted, and the tiebreak itself is asserted against the query text. That
last one is deliberate and carries the same caveat as the `te_geg_ballots` suite:
with `id ASC` removed MySQL still happens to return these rows in id order, so
the behavioural comparison passes with the property broken. Mutation-checked —
removing the tiebreak fails only the structural test, which is precisely why it
is the one kept.

The comparison is on ciphertexts and weights, not voters: the committee feed
omits `voter` by design, because it must not learn who cast which ballot.

#### Resolution

Less was needed than the finding assumes, because the hub half already existed:
`auditAggregate` (`te.ts:65`) spreads the stored envelope, so `admitted` and
`exclusions` were **already being served** to the panel's endpoint. `te_aggregate`
holds the canonical `aggregate_json`, which carries both — and after **L-5** that
JSON is deterministic, so the pair the panel reads is now well-defined.

What was missing:

1. `te_ballots` now emits `sequenceNumber` — the position in the shared order.
2. `aggregateBallots` sums the **admitted** set only, and reports `exclusions`
   and `admittedSetResolved` beside `aggregateMatches` instead of folding them in.
3. The panel shows exclusions as their own section, saying plainly that this is
   expected behaviour and not a verification failure, with a per-reason breakdown.
4. An admitted ballot the hub did not serve gets its own stronger message: that is
   not a sum that disagrees, it is two views of the election disagreeing about
   which ballots exist, and collapsing the two would hide the worse one.
5. Both fields ride into the downloadable audit bundle, so someone reproducing the
   check offline knows which ballots were in scope.

`admitted` absent falls back to summing everything — the old behaviour, for
aggregates published before the committee took over.

#### Severity was lower than filed, because of other fixes

The finding's premise is that ordinary exclusions make the panel cry wolf. By the
time it was reached, every exclusion reason is pre-empted at ingest:
`OUT_OF_WINDOW` by `isWithinGegVotingWindow` applying geg's half-open
`start <= t < end` (`sequencer/helpers/te.ts:168`), `INVALID_ATTESTATION` by
minting **and verifying** the credential at ingest, `INVALID_PROOF`/`MALFORMED` by
`verifyBallot`, `DUPLICATE_PSEUDONYM` by re-votes updating in place. A healthy
election should produce no exclusions at all.

So the false alarm is not the everyday case the finding describes. What remains is
still worth fixing: when exclusions *do* occur — a hub/committee disagreement of
the M-2 kind, or SDK drift — the panel said "does NOT match", which is true but
attributes it to the wrong thing and leaves an auditor nothing to act on. And a
non-empty exclusion list now means the hub admitted something the committee would
not, which is exactly the thing worth showing.

#### Tests — 7 added to `apps/ui/src/helpers/teVerify.test.ts`

Built on a single admitted weight-1 ballot, so the expected aggregate is that
ballot's own ciphertext — the generator. No arithmetic is reproduced in the test,
which keeps the expectation independent of the code under test.

Covered: an exclusion still matching (the regression); the same fixture *without*
the admitted set failing, which is what made this a false alarm; exclusions
reported rather than folded into the match; the legacy fallback when `admitted` is
absent; an admitted ballot the hub did not serve; a clean resolve; and a ballot
with no sequence number being ignored once `admitted` is in play.

Mutation-checked, both caught: removing the admitted restriction fails 2, forcing
`admittedSetResolved` true fails 1.

Suites: UI 252 passed / 19 files; hub unit 100 / 8 suites; hub e2e 7 suites /
60 passed.

### M-5 — Plan acceptance criteria not delivered: no `te_geg_ballots` tests, no golden legacy-equivalence fixtures, no conformance suite [DONE — all three delivered]

**Files:** absent — see `apps/hub/test/`, `packages/geg-parity/`, `.github/workflows/`

#### Resolution

Accepted in full: all three were genuinely missing, and nothing in the implementation
needed to change to add them — which is the point. Each is a check that the code as
written already passes, so their absence was the report's real finding: **the silent
failure modes flagged elsewhere had nothing holding them down.**

Every test below was mutation-checked — the relevant behaviour was broken in the
source and the test confirmed to fail — because a test that passes against broken
code is worse than no test, and two of these did exactly that on the first attempt
(see *What the first attempts got wrong*).

#### 1. R5 materialization — `apps/hub/test/e2e/geg-ballots-materialization.test.ts`, 12 tests

End-to-end against a real hub and a real MySQL, not a mock, because the properties at
risk are properties of the SQL:

| | what would break silently |
| --- | --- |
| numbers ballots contiguously from zero | a gap makes quorum never form (H3) |
| orders by `(created, id)` | tied timestamps reorder between reads |
| the fixture *has* a tied timestamp | otherwise the ordering test is vacuous |
| `countOnly` agrees with a full read | the committee sizes its work off the count |
| empty page past the end | a keyper's last page 500s |
| oversized page is capped, not refused | a keyper asking for 5,000 gets nothing |
| the stored credential is emitted, not re-derived | re-derivation at read time would undo ingest-time attestation |
| renumbering after a soft delete | numbering drifts against a prior read |
| a ballot with no credential fails the **whole** read | a partial election tallies as if complete |
| the count is the election's, not the page's | truncation reads as a completed tally |
| a page truncated at the cap still reports the full total | as above, from the other side |
| the second page continues at the right number | the cap silently drops the tail |

The plan asked for "two chunk sizes → identical `sequenceNumber → ballot`" and "two
full reads → identical aggregate input"; both are covered, and the last three go
past it, because the page cap did not exist when the plan was written — it was added
for **H-2** in this same report, and a cap is precisely the kind of change that turns
a complete read into a quietly truncated one.

#### 2. R7 golden legacy fixtures — `packages/geg-parity/vectors/legacy-equivalence.json`

The plan wanted these captured *before* the legacy tally was deleted. It was not, but
the file is still reachable at `master:apps/sequencer/src/helpers/te.ts`, so
`packages/geg-parity/scripts/gen-legacy-equivalence.ts` recovers it from history and runs it.

The corpus is deliberately **not** three equivalence claims, because equivalence is
not what we want in all three places:

- `equivalent` — weights inside the cap and above the dust floor, where legacy and
  current must agree byte for byte. This is the actual regression guard.
- `divergent` — a whale over the cap, recording **both** answers and why they differ.
  Legacy never clamped (`BigInt(Math.round(vote.vp))`, no ceiling); current clamps at
  `maxWeight`. A fixture asserting agreement here would pin behaviour we changed on
  purpose and would have to be deleted the first time it correctly failed.
- `boundary` — a total admitted weight past 2^53, recording that a JS number stops
  being exact there.

Consumed by `apps/ui/src/helpers/teVerify.legacy-equivalence.test.ts` (5 tests),
which is where it matters: the verify panel is the surface that has to reproduce a
tally independently, so it is the one that must not drift from the old arithmetic.

#### 3. Port conformance — `scripts/geg/verify-port-contract.py`

**geg's own `tests/conformance.py` cannot be run against this translator**, and this
is a design consequence rather than a gap:

1. every conformance test opens with `register_election`; the translator answers 501,
   because elections are Snapshot proposals created through the sequencer;
2. the suite submits ballots through the port; also 501, for the same reason — ballots
   are signed Snapshot votes;
3. the suite calls `set_time` to step an election through its lifecycle; the hub reads
   wall-clock time.

The suite assumes a backend it owns end to end. Ours is a read-only projection of a
system with its own write path, which is the whole shape of the integration.

What *is* portable is the part §14 was actually buying — that **geg's own client can
decode what this hub serves**. `apps/te-data-layer/test/app.test.ts` cannot answer
that: it drives the translator against mocked hub responses, so every wire contract
is checked against a body we wrote ourselves. The script imports geg's real
`HttpDataLayer` and points it at a running translator, so every object under
assertion is produced by geg's codecs from the hub's bytes. Eight checks:

    ok  get_election decodes into an ElectionConfig
    ok  count_ballots returns an int
    ok  read_all_ballots pages and verifies completeness
    ok  count_ballots agrees with the committee's aggregate
    ok  get_aggregate decodes into an AggregateArtifact
    ok  list_decryption_shares decodes
    ok  get_result decodes, totals exact
    ok  derive_state accepts the record

A renamed key, a changed enum, a number where a string was expected — none of which a
mock catches — fail here. Run against a real tallied election, not a fixture.

#### What the first attempts got wrong

Recorded because both passed, and a passing test is the failure mode of a test suite:

- **The tiebreak test was vacuous.** It asserted that ballots with identical `created`
  come back in `id` order — which MySQL does anyway, even against an adversarial
  fixture, so it passed with `ORDER BY created` alone. Replaced with a structural
  assertion on the query text, which is the only thing that actually distinguishes
  "ordered deterministically" from "happened to be ordered".
- **The `countOnly` cap was invisible below 1,000 ballots.** The cap tests all passed
  against a fixture that could never reach it. A 1,001-ballot fixture was added.
- **The port-contract script had a hole.** A stub hub reporting `count = 0` passed
  every check, because `read_all_ballots` trusts the count and an empty list is
  trivially contiguous. Cross-checking the count against the committee's own
  aggregate (`admitted + exclusions`) closes it.

#### CI

Not wired, and left that way deliberately. `packages/geg-parity` and
`apps/te-data-layer` already run under the root `bun run test` turbo task, so (2) is
gated today. (1) needs a live hub and MySQL and (3) needs a tallied election and a
geg checkout — both are stack-level integration checks, and this repository does not
deploy the stack (`DEPLOYMENT-ALIGNMENT.md` §W5). Wiring them into `.github/workflows/`
would mean standing up that stack in CI, which is the deployment question this branch
does not own.

#### Suites

Hub e2e 5 suites / 43 passed (includes the 12 above), hub unit 90, sequencer unit
200, sequencer integration 105 passed / 13 suites, te-data-layer 78, UI helpers 19
files. Three e2e fixtures gained the `te_config` a real private proposal always
carries — the **M-2** belt asserts it agrees with the advertised budget, and the
fixtures predated the assertion.

Three sequencer integration suites fail (`ingestor`, `helpers/actions`,
`helpers/moderation`) and the sequencer's e2e suite cannot boot at all
(`initializeStrategies()` gets a premature close from `score.snapshot.org`). All four
are external-dependency failures on this machine, and every file involved —
`ingestor.ts`, `helpers/actions.ts`, `helpers/moderation.ts` and their tests — is
byte-identical to `master`, so none of them exercises anything this branch changed.

Three explicit, named acceptance criteria are missing:

1. **R5 materialization tests.** Issue 2b: *"Materialization tests: two chunk sizes → identical `sequenceNumber → ballot`; two full reads → identical aggregate input."* `te_geg_ballots` — which the plan calls correctness-critical because a numbering drift makes quorum silently never form (§6.4 R5, H3) — has **no test anywhere in `apps/hub/test/`**. The only files mentioning it are the translator's mock-based tests and a benchmark. The dust predicate, the clamp, the contiguous-sequence assignment, the `countOnly` path, and pagination are all untested.

2. **R7 golden legacy fixtures.** Issue 5 and the Phase 4 exit gate call for legacy `aggregateBallots`/`recoverTeTally` outputs to be captured as checked-in fixtures **before** deletion, plus an over-cap clamped-divergence fixture and a `>2^53` float-boundary fixture, as a permanent CI regression guard. The legacy code is deleted (`scores.ts`, `helpers/te.ts`) and no such corpus exists. The one-shot equivalence proof the plan was trying to preserve is now unrecoverable.

3. **Port conformance.** §14 calls running geg's own `tests/conformance.py` against the translator *"the single highest-value test in the plan."* It is not wired. `apps/te-data-layer/test/app.test.ts` is thorough but tests the translator against **mocked hub responses**, so it proves the translator's shape-mapping and nothing about whether the hub's actual bodies satisfy geg's client.

Also: `.github/workflows/` is **unchanged on this branch**. `packages/geg-parity` and `apps/te-data-layer` do run under the root `bun run test` turbo task, so Gate 0 is genuinely gated — but there is no CI acknowledgement of the new service or its integration surface.

**Recommendation.** These are the checks the plan designed to catch exactly the silent failure modes flagged elsewhere in this report (M-2's zeroed tally, H3's quorum drift). Land at least (1) and (3) before cutover; (2) requires reconstructing fixtures from `git show master:apps/sequencer/src/helpers/te.ts` while it is still in history.

---

## Low

### L-1 — `maxWeight` semantics deviate from D11 and change governance outcomes

**File:** `apps/hub/src/helpers/gegConfig.ts:39-54`

The plan specifies `maxWeight = 2^53-1` frozen (D11/R2), with the stated consequence "legacy-exact **below** the cap". The implementation derives `maxWeight = floor(1_000_000 / budget)` — 1e6 for basic voting, 1e4 at the default weighted budget of 100.

This is a defensible correction (it keeps `budget × maxWeight` inside the protocol's BSGS ceiling, which `2^53-1` would not), it is disclosed to proposal authors in the editor tooltip (`Editor.vue:118-131`) and in `SelectPrivacy`, and the verify panel now reports which ballots were clamped. But it is a materially different governance rule from the one the plan records, it is not configurable (the constant is hardcoded in three places — `gegConfig.ts:39`, `constants.ts:41`, and implicitly in `teVerify`), and no voter-facing surface says a ballot was counted at the cap. Neither `geg-integration-plan.md` D11 nor H14 has been updated to match.

**Recommendation.** Update D11/H14 in the plan to record the actual rule and its rationale, make `MAX_BUDGET_TIMES_WEIGHT` a single exported constant sourced from one place, and consider surfacing clamping on the results view, not only in the audit panel.

### L-2 — `update-proposal` derives `privacy` differently in `verify()` and `action()` [DONE — one shared derivation, used by both writers]

**File:** `apps/sequencer/src/writer/update-proposal.ts:88-89` vs `111-114`

`verify()` computes `effectivePrivacy = spacePrivacy !== 'any' ? spacePrivacy : proposalPrivacy ?? proposal.privacy` — falling back to the proposal's existing privacy. `action()` computes `privacy = spacePrivacy !== 'any' ? spacePrivacy : (msg.payload.privacy ?? '')` — falling back to **empty**.

In an `any`-privacy space, an update whose payload omits `privacy` passes the new `shutter-elgamal` lead-time gate (verify sees the proposal as still private) and then writes `privacy = ''`, silently converting a private proposal to public while leaving `te_geg_config`, `te_keyper_*` and possibly `te_mpk` populated. The proposal then 400s on every geg read (`geg.ts:139-141`) and drops out of `te_geg_elections`, stranding any in-progress DKG.

The `action()` half is pre-existing behaviour, but the divergence from the new `verify()` logic is introduced here.

**Recommendation.** Extract one `effectivePrivacy(space, payload, existing)` helper and use it in both.

#### Resolution — accepted as recommended

`src/helpers/privacy.ts` now owns the derivation, and all four call sites use it:
`verify()` and `action()` in `writer/update-proposal.ts`, and both halves of
`writer/proposal.ts` (creation, which passes no `existing`, collapsing the chain to
the `''` it already used — a proposal that does not exist yet has no privacy to
preserve).

```ts
const spacePrivacy = space?.voting?.privacy ?? 'any';
if (spacePrivacy !== 'any') return spacePrivacy;
return payload?.privacy ?? existing?.privacy ?? '';
```

The finding's diagnosis is exactly right, and worth restating as the reason the fix
is *one function* rather than a corrected fallback: **both fallbacks were defensible
in isolation.** `verify()` preserving the row's privacy is right for a gate that asks
"is this proposal private?"; `action()` defaulting to `''` is right for a writer
building a row from a payload. Neither is wrong on its own reading, and the bug
existed only in the gap between the two readings — so the fix has to remove the gap,
not pick a winner.

Where the two had to be reconciled, `verify()`'s reading wins, because omission is
not a request: `privacy` is optional in the `updateProposal` schema, so a client that
does not mention it is saying nothing about privacy. Going public is spelled
`privacy: ''` — a distinct value the schema accepts and the UI already sends
(`apps/ui/src/networks/offchain/actions.ts:222`), so preserving on omission does not
close the door the finding's failure mode was walking through.

#### Reachability

The UI always sends `privacy`, so this is an API-surface bug rather than one users
could hit through the app. It is reachable by any other client, and the affected
configuration is the common one — `voting.privacy: 'any'` is the default, and it is
what `demo.eth` runs on the live stack.

`te_geg_config`, `te_mpk` and the keyper rows are deliberately **not** cleared when a
proposal legitimately goes public. Voting cannot have started (`verify()` rejects an
edit to a started proposal), so no ballots are stranded, and keeping the frozen
committee means flipping back to private reuses the key already generated for that
exact proposal instead of demanding a second ceremony.

#### One behaviour change beyond the divergence, verified

Correcting `action()` does not only change the value written — it changes which code
paths the edit takes. An omitted-privacy edit on a private proposal now enters the two
`privacy === 'shutter-elgamal'` blocks it used to skip, so an edit that previously
*succeeded* can now be refused:

| state of the row | before | now |
| --- | --- | --- |
| `te_geg_config` missing `weightedBudget` | silently written public | rejected, `private voting unavailable` |
| `te_geg_config` NULL | silently written public | tries to build a committee; rejected if the eligibility service is unreachable |

Both were checked against the real writer. This is correct rather than a regression:
it is exactly the path an explicit `privacy: 'shutter-elgamal'` edit already took, and
the fix's whole purpose is that the omitted case and the explicit case stop diverging.
The refusal is also the honest answer — the proposal *is* private, and its ballot
params cannot be rebuilt safely — where the old "success" was the corruption. It is
recorded here because it is user-visible: an edit that used to return 200 can now
return an error, and the operator reading that error should know it is the bug being
caught rather than a new fault.

#### Equivalence check

Both derivations were compared against the expressions they replaced across every
combination of 7 space settings × 5 payloads × 6 existing rows:

- creation: **0 differences in 35 cases** — byte-identical, as intended;
- `verify()` on update: **0 differences**;
- `action()` on update: differs in exactly 16 cases, every one of them
  `space` not pinning **and** payload omitting `privacy` **and** the row already
  private — `'' → 'shutter'` or `'' → 'shutter-elgamal'`. No unintended cell, and
  every change is in the fail-safe direction (preserve privacy, never remove it).

`action()` also runs only after `verify()` resolves (`src/ingestor.ts:249,281`), so
schema validation always precedes the new fallback and a non-string `privacy` cannot
reach it.

#### Tests — `test/integration/writer/update-proposal-privacy.test.ts`, 8 tests

Driving the real writer against a real database, seeded as a private proposal that is
already past DKG, so a fixture cannot pass by having the edit refused outright:

| | |
| --- | --- |
| omitted `privacy` keeps the proposal private | the regression itself |
| the row never reads public while still carrying a committee | the actual harm, asserted as a pair |
| `verify()` gates it private and `action()` writes the same | the two halves, against each other |
| the DKG lead-time gate still fires on inherited privacy | pins `verify()` to the *row*, not just the helper |
| explicit `privacy: ''` still goes public | preserving must not be a one-way door |
| explicit `privacy: 'shutter-elgamal'` still stays private | |
| a public proposal stays public on omission | the fallback reads the row, it does not default |
| a space that pins its privacy overrides the payload | |

Mutation-checked against three mutants, each caught:

- `action()`'s old `?? ''` fallback restored — 3 tests fail;
- space pinning ignored — 1 fails;
- `verify()` stops passing the existing row — 1 fails.

The third is why the lead-time test is there. The first version of this suite asserted
only that `verify()` resolves, which is true whether or not it consults the row, so
that mutant survived. A second test was vacuous for the same reason: it checked
`te_geg_config` alone, and the edit never touches that column, so it passed against
the bug. Both were rewritten to assert the relationship rather than the field.

Suites: sequencer unit + all writer integration, 257 passed / 26 suites.

#### Note for L-4

This makes the private→public flip deliberate, but does not change what happens after
one. A coordinator mid-DKG on a proposal that has just gone public still gets a 400
where the port contract specifies 404, so it retries a `ValueError` forever instead of
treating the election as gone. L-2 was the accident; L-4 is the part that makes the
consequence permanent.

### L-3 — Mirrored vote count includes soft-deleted votes [DONE — no change; this matches upstream Snapshot, and the filter it asks for is the divergence]

**File:** `apps/sequencer/src/scores.ts` (`runShutterElgamalTally`)

```ts
const [{ n }] = await db.queryAsync('SELECT COUNT(*) AS n FROM votes WHERE proposal = ?', [proposal.id]);
```

The path this replaced counted `rawVotes.length` from a query filtered on `cb != CB.PENDING_DELETE`, and both `te_ballots` and `te_geg_ballots` still apply that filter. A proposal with soft-deleted votes now publishes a `votes` count higher than the number of ballots that were actually tallied.

**Recommendation.** Add `AND cb != ?` with `CB.PENDING_DELETE`.

#### Resolution — deliberately not applied

The finding is factually right and the diagnosis of *how* it happened is right: `master`
counted `rawVotes.length` from a `cb != PENDING_DELETE` query, this branch moved
aggregation to the committee, `rawVotes` disappeared with it, and the replacement
`COUNT(*)` lost the filter.

It is still the wrong change to make, because **upstream Snapshot has never filtered
this count in any privacy mode**, and matching upstream is the standing rule for this
integration. Checked against `snapshot-labs/sx-monorepo` master:

| | what is tallied | what `proposals.votes` reports |
| --- | --- | --- |
| upstream, public | unfiltered `getVotes` (`scores.ts:31`) | unfiltered `votes.length` (`scores.ts:211`) |
| upstream, **shutter** | **filtered**, `cb != PENDING_DELETE` (`helpers/shutter.ts:80`) | unfiltered `votes.length`, via the shared `updateProposalAndVotes` |
| **this branch** | **filtered**, `cb != -3` (hub ballot feed, `geg.ts:285,301`) | unfiltered `COUNT(*)` |

Upstream draws the line in exactly one place — it filters what it *decrypts and
tallies*, never the count it publishes — and the shutter row is the direct analogue of
ours. Our shape is identical to it.

So the regression is real against `master` and not against Snapshot: it was our earlier
shutter-elgamal work that filtered the count, which upstream does for no privacy mode,
and this branch converged on upstream by accident. Applying `AND cb != ?` would restore
a local deviation, and would also make our two private modes disagree with each other —
classic `shutter` proposals in the same database would keep reporting the unfiltered
figure.

#### What the finding is still right about

`proposals.votes` can exceed the number of ballots the committee tallied. That is true,
it is upstream's behaviour, and it is not what an auditor should be reading: the
authoritative count is the hub's filtered `count_ballots`, which the port-contract check
`count_ballots agrees with the committee's aggregate` already pins (M-5). Soft-deleted
rows are also transient — `helpers/deleteProposalVotes.ts` reaps them in batches — so
the two figures converge on their own.

Revisit this only if upstream starts filtering, at which point both sites change
together rather than ours drifting alone.

### L-4 — Non-private proposals answer 400 where the port contract expects 404 [DONE — fixed on all 11 routes; the stated consequence does not hold, the contract argument does]

**File:** `apps/hub/src/geg.ts:139-141` (and the same guard on eight other routes)

Plan §4.2 maps *"unknown proposal; **not `shutter-elgamal`**"* to 404 → `KeyError`. The implementation returns 400 → `ValueError` (malformed request). Combined with L-2, a proposal that flips from private to public mid-DKG produces a persistent `ValueError` on every coordinator poll rather than the `KeyError` that lets `scan_once` treat it as gone and move on.

**Recommendation.** Return 404 for `privacy !== 'shutter-elgamal'`, matching the documented mapping.

#### Resolution — applied as recommended, for a different reason

All eleven routes now answer 404. The recommendation is right and the mapping it
cites is right: geg's client maps 404 to `KeyError` and every other status to
`ValueError` (`adapters/db/client.py:42-47`), so 400 tells a caller its request was
malformed — and a caller told that has no reason to stop sending it, nor any way to
tell a public proposal apart from a genuine protocol error.

The proposal existing in Snapshot is not the question. This API serves *elections*,
only a private proposal is one, so the resource really is absent — the same answer a
deleted proposal gets, distinguished by message (`proposal_not_private` vs
`proposal_not_found`) rather than by status.

#### The stated consequence does not hold

The finding says the 400 *"produces a persistent `ValueError` on every coordinator poll
rather than the `KeyError` that lets `scan_once` treat it as gone and move on."*
Neither half survives checking, and both are worth correcting so the severity is not
carried into a later decision on the strength of them:

1. **`scan_once` has no `KeyError` branch.** Both of its guards are
   `except Exception as err` (`coordinator.py:370, 379`); each records
   `outcomes[eid_hex] = "error"` and logs. A `KeyError` and a `ValueError` are handled
   identically, so this change moves nothing in the coordinator.
2. **A public proposal is never polled.** `te_geg_elections` selects
   `WHERE privacy = 'shutter-elgamal'` (`geg.ts:110-111`), so a proposal that flips
   public leaves the list and `scan_once` stops calling `get_election` on it entirely.
   The scenario needs an in-flight call to be caught mid-flip, which yields one error
   and not a persistent one.

So this is a **contract-correctness fix, not a liveness fix**. It matters for callers
that do branch on the distinction — geg's own client already does, and the conformance
surface assumes it — rather than for our coordinator today. Its interaction with L-2
is weaker than the report suggests, and L-2 is fixed regardless.

#### Tests — `test/e2e/geg-not-an-election.test.ts`, 13 tests

Against a real public proposal and a running hub: all eleven routes asserted
individually rather than sampled, because the guard is copied eleven times and a
per-route test is the only thing that catches a twelfth copy being written with the
old status. Plus two properties the status alone does not carry — that the two 404s
stay distinguishable by message for an operator reading a log, and that a public
proposal is not offered in the elections list in the first place, which is what makes
the 404 a backstop rather than the primary defence.

Mutation-checked: reverting to 400 fails 11 of 13. Hub e2e 6 suites / 56 passed;
te-data-layer 78 passed (it forwards the hub's status unchanged, so it needed no
change).

#### Observation, not fixed

The guard is duplicated verbatim across eleven handlers, which is what allowed a
single documented rule to be implemented wrongly in eleven places at once. A shared
`requireElection(res, proposal)` would collapse them, but that touches every route in
the file and is wider than this finding; noting it rather than doing it.

### L-5 — `canonicalAggregateFor` resolves the winning JSON with `MIN()`, which is not the digest's canonical form [DONE — fixed, but as a number: the recommended decimal string would break every aggregate read]

**File:** `apps/hub/src/geg.ts:549-564`

```sql
SELECT digest, COUNT(*) AS c, MIN(aggregate_json) AS aggregate_json ... GROUP BY digest
```

Rows sharing a digest can still differ in `aggregate_json`, because `canonicalAggregate` does **not** normalize `totalAdmittedWeight` (`geg.ts:611`: `raw.totalAdmittedWeight ?? 0`) while `aggregateDigest` coerces it through `BigInt` (`gegDigests.ts:189`). A keyper sending `100` and one sending `"100"` produce the same digest and different stored JSON; `MIN()` then picks by lexicographic string order. The digest is what decides agreement so the tally is unaffected, but the JSON served to the committee and to auditors becomes non-deterministic, and `proposals.te_aggregate` may not match what a given keyper signed.

**Recommendation.** Normalize `totalAdmittedWeight` to a decimal string inside `canonicalAggregate` so `aggregate_json` is a function of the digest.

#### Resolution — diagnosis accepted, remedy changed

The analysis is exactly right, down to the mechanism: `aggregateDigest` coerces the
field through `BigInt(...).toString()` (`gegDigests.ts:189`) while `canonicalAggregate`
kept whatever arrived (`geg.ts:611`), so two submissions could share a digest and differ
as text, and `MIN(aggregate_json)` then picked between them lexicographically.

**But the recommended form cannot be used.** geg's own decoder requires a Python `int`:

```python
def _int(value, *, name, minimum=None):
    if isinstance(value, bool) or not isinstance(value, int):
        raise CodecError(f"{name}: expected integer, got {type(value).__name__}")
```

`dec_aggregate` reads `totalAdmittedWeight` through it (`envelopes/codecs.py:278`), so
quoting the field would make **every** `get_aggregate` fail with a codec error — the
committee could not build decryption shares and no election could finish. The stored
envelope is not ours alone; it is served back over the port.

So the field is canonicalised to a **number** instead, which satisfies the same
property — `100` and `"100"` both store as `100`, and `aggregate_json` becomes a
function of the digest — without changing the wire type the protocol expects.

#### What else could vary under one digest: nothing

Worth stating, because the fix is only complete if this field was the last one. The
other members of the envelope were checked:

- `aggregates` — `canonicalPoint` lowercases and normalises the `0x` prefix;
- `admitted` — validated to non-negative integers, order-significant in both the JSON
  and the digest, so a reordering is a *different* digest rather than a same-digest
  variant;
- `exclusions.reason` — already canonical, because the digest rejects any string
  outside `EXCLUSION_CODES` and that table is injective, so no two reason strings can
  land on the same code;
- `electionId`, field order — fixed by the object literal.

`totalAdmittedWeight` was the last one.

#### The 2^53 boundary, and why this refuses rather than rounds

The digest carries this value as a decimal string precisely because it can be large.
The aggregate body, however, is parsed by `express.json()`, so an oversized literal has
already lost precision before `canonicalAggregate` sees it — and the digest computed
from it no longer matches what the keyper signed. Today that surfaces as an
unauthorised-signer rejection with nothing pointing at parsing.

`canonicalWeight` therefore refuses above `Number.MAX_SAFE_INTEGER` with a message
naming the cause, rather than storing a number that is quietly wrong. The bound is not
reachable in practice — with the per-ballot ceiling at 1e6 it takes some 9×10⁹ ballots
— and if it ever becomes reachable the fix is to read this route from `rawBody` through
`parseJsonPreservingBigInts`, exactly as the result route already does
(`geg.ts:1232`).

#### Refactor

`canonicalWeight`, `canonicalPoint` and `canonicalAggregate` moved to
`src/helpers/gegAggregate.ts`. They are pure and have no database dependency, and the
property they carry — equal digest implies equal stored text — is worth testing without
standing up the router.

#### Tests — `test/unit/geg-canonical-aggregate.test.ts`, 10 tests

The property is asserted directly rather than by checking the field's type: each case
confirms the two envelopes produce the **same digest** and then that they produce the
same stored text. Checking the type alone would pass against a canonicaliser that
normalised to something the digest disagreed with.

Covered: three same-digest pairs (number/string, a large value, zero); the field
staying a JSON number; a missing weight defaulting to zero as the digest does; distinct
weights *not* collapsing (a canonicaliser that returned a constant would otherwise pass
everything above); negative, fractional and non-numeric weights refused; and the
2^53 boundary — refused one past it, accepted at it.

Mutation-checked, both caught:

- the original pass-through restored — 8 of 10 fail;
- **the recommendation as written** (normalise to a decimal string) — 3 of 10 fail,
  including the test that pins the protocol decoder's requirement.

Hub unit 100 passed / 8 suites; hub e2e 6 suites / 56 passed.

---

## Informational

### I-1 — `adminKey` in the served config no longer describes who can actually resume

`gegConfig.ts:204` publishes `adminKey` from the frozen snapshot (the space's first admin at creation time), while enforcement uses the **live** space admin list (`geg.ts:1347-1357`, falling back to the author). An auditor reading the election config will conclude one address controls the retry when in practice any current space admin does, and that set is mutable by the space controller after creation. This is a deliberate improvement over plan D12's single fleet-wide `TE_ADMIN_ADDRESS`, but the config should describe it honestly — and D12 in the plan should be updated to match.

### I-2 — The result write is not bound to the canonical aggregate or the share quorum

`POST /te_result` (`geg.ts:1175-1280`) verifies only that the publisher key signed those totals. It does not check that a canonical aggregate exists, that `keyperIndices.length >= thresholdT`, that those indices actually submitted shares, or that voting has ended. A compromised coordinator key publishes arbitrary totals which the sequencer mirrors straight into `scores` with `scores_state = 'final'`. This matches the plan's D5 trust model (detection, not prevention — and `TeVerifyTallyPanel` does independently recover the tally from shares and compare), but the cheap preconditions are worth adding as defence in depth.

### I-3 — The translator applies `Access-Control-Allow-Origin: *` to its write routes

`app.ts:135` — `app.use(cors({ maxAge: 86400 }))` is mounted before both read and write routers. Credentials are not enabled, and every write is signature-gated at the hub, so the practical impact is limited to letting any web page act as a free relay for replayed writes. Restricting CORS to the read router would cost nothing.

Note the relayed-replay half of this is now materially smaller: since **M-1**, a stall or resume signature is valid for one use inside a 300-second window, so a page relaying a captured one achieves nothing. The remaining writes are content-bound and idempotent (`result` is first-write-wins; the keyper submissions are keyed by `(proposal, keyper)`), so a relayed replay of those is inert too. The tidy-up is still worth doing, but it is hygiene rather than a live exposure.

### I-4 — Minor deviations and residue

- `.env.example` still documents `HUB_RELAYER_PK`, but `docker-compose.yml` no longer passes `RELAYER_PK` to the hub service. Verify the hub does not need it before cutover.
- Plan §4.1 specifies `GET /elections?adminKey=`; the translator ignores the parameter and the hub's `te_geg_elections` filters only on actionability (`geg.ts:109-126`). Acceptable per §11.3, but the parameter is silently dropped rather than rejected.
- Plan Phase 6 calls for `architecture.md` rewritten, `architecture-legacy.md` retained, and a new `keyper-operator-guide.md`. Only `docs/private-voting/README.md` was rewritten; the other two do not exist.
- Attestation signatures are freshly randomized per read, so two full reads of `te_geg_ballots` are **not** byte-identical (only the weights, ordering, and sequence numbers are). This does not affect the aggregate digest — which covers no signatures — but the R5 wording in the plan ("two independent full reads produce byte-identical aggregate inputs") should be narrowed to say so explicitly.
- Legacy cleanup is complete and verified: no references remain to `services/keypers`, `keyper_bootstrap_tokens`, `te_keyper_tokens`, `SX-TE-*` digests, `packages/private-vote-sdk`, or `scripts/parity-gate.mjs`.

---

## What the branch got right

Called out because a findings list reads as if nothing worked.

- **Threshold semantics were corrected against the protocol, not against the plan.** The plan repeatedly says "t+1 quorum" with `TE_THRESHOLD_T=1`; geg's own `flow/full_election_level1.json` vector settles it (`threshold: {t: 2, n: 3}`, `keyperIndices: [1, 2]`) — `t` *is* the quorum. The branch adopts that meaning consistently across hub, sequencer, and the UI's `recoverTally` boundary, with the `-1`/`+0` conversions documented at each seam. It also adds a majority check (`2t > n`) the protocol does not enforce.
- **Gate 0 is a real gate.** 24 vectors across 10 categories are vendored with commit provenance, the sync script is one-directional from geg, the corpus fails if a vector is neither checked nor declared covered, and all four consumers pin `urban-verified-crypto@0.2.0` identically.
- **D14 backward compatibility holds.** Every private path is gated on `privacy = 'shutter-elgamal'`, the scheduler predicate is exported specifically so the regression test asserts against the real SQL, and `public-path.test.ts` covers the create/vote/tally path.
- **The signature-recovered keyper index** (never taken from the request body, in all three write paths) closes a slot-squatting attack the plan did not explicitly call out.
- **`GEG-RESULT-v1` binds the totals.** The code notes an earlier upstream form signed only `(operation, election)`, which would have let one captured signature authorise any totals; the implementation nests `resultDigest` inside the request wrapper.
- **The oversized-integer handling** (`bigIntJson.ts`, raw-body forwarding through the translator, string storage in `te_results`, string-composed response) is a correct and non-obvious solution to a problem that would have presented as an authorization failure.
- **R1, R6, and the H12 pre-existing lead-time bypass** are all fixed as specified.

---

## Tools used

| Tool | Version | Notes |
|---|---|---|
| `git` | system | diff scoping, history recovery |
| Manual review | — | all findings |
| `semgrep`, `gitleaks`, `gosec`, `bandit` | not installed | Phase 2 SAST could not be run |

A manual pass over the diff for the Phase 2e hard rules (hardcoded credentials, unsafe deserialization, command injection, disabled TLS verification, non-CSPRNG for security values, SQL string concatenation, CORS `*` with credentials) found no violations. All SQL in the new code is parameterized.

---

## Disclaimer

This review covers the changes on `feat/generalised-el-gamal-integration` relative to `master` at commit `fb4bc1be`, assessed against `geg-integration-plan.md` and `geg-integration-issues.md`. It does not cover the `generalised-el-gamal` implementation itself, which was not available in this environment — statements about geg's behaviour are inferred from the vendored vector corpus and the plan, and should be confirmed against that repository. No dynamic testing, fuzzing, or live-stack exercise was performed. A clean audit is not a guarantee of correctness.
