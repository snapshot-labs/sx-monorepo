# Manual MetaMask end-to-end runbook — permanent private voting

Drive the **exact same** permanent-private (`shutter-elgamal`) flow the audit
spec exercises, but with a **real MetaMask wallet on Sepolia** signing real
EIP-712 envelopes against the **local** sequencer + hub + keyper committee.

What is real here:
- Your MetaMask account signs the EIP-712 `Proposal` and the encrypted
  `Vote` envelopes (identical typed-data to production Snapshot).
- The local sequencer verifies the signature, validates the schema, and the
  relayer co-signs + persists to the hub — exactly the production ingest path.
- A 3-keyper threshold-ElGamal committee runs DKG and publishes DLEQ-proven
  decryption shares; the tally is recovered homomorphically.

**Everything except signing in MetaMask is automatic.** You do **not** run any
Python scripts during the flow:
- The **auto-DKG coordinator** (bundled into the keyper launcher) watches for
  new `shutter-elgamal` proposals and generates the threshold key within a
  couple of seconds of publishing — no `run_dkg.py`.
- The **sequencer's tally scheduler** watches for closed proposals, nudges the
  keypers to publish decryption shares, and finalises the tally — no
  `run_decrypt.py`.

What is *not* on-chain: votes are off-chain signatures (no gas, no Sepolia
ETH needed). The `ticket` strategy grants every address voting power = 1, so
any MetaMask account can propose and vote.

> The headless equivalent of the propose + DKG legs is
> [scripts/wallet_smoke.py](../../scripts/wallet_smoke.py) — run it first if
> you want to confirm the stack before touching the browser.

---

## 0. Prerequisites (one time)

- MetaMask installed, with the **Sepolia** test network enabled and at least
  one account selected. No funds required.
- The Python venv at `thresholdELGamal/.venv` with `pymysql`, `requests`,
  `eth_account` (install with
  `thresholdELGamal\.venv\Scripts\python.exe -m pip install pymysql requests eth-account`).
- `apps/ui/.env.local` must contain:
  ```
  VITE_LOCAL_HUB_URL=http://localhost:3000/graphql
  VITE_LOCAL_SEQUENCER_URL=http://localhost:3001
  ```
- `apps/sequencer/.env` must point at the local MySQL (see that file).

Throughout, `PY` = `D:\dev\snapshotpermanentprivatevoting\thresholdELGamal\.venv\Scripts\python.exe`
and scripts live in `D:\dev\snapshotpermanentprivatevoting\scripts`.

---

## 1. Bring up the stack (5 terminals, in this order)

| # | Service   | Command | Listens |
|---|-----------|---------|---------|
| 1 | MySQL 8.4 | `Start-Process "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" -ArgumentList '--defaults-file=D:\mysql.ini'` | :3306 |
| 2 | Hub       | `cd sx-monorepo\apps\hub; bun run dev` | :3000 |
| 3 | Sequencer | `cd sx-monorepo\apps\sequencer; bun run dev` | :3001 |
| 4 | UI        | `cd sx-monorepo\apps\ui; bun run dev` | :8080 |
| 5 | Keypers + auto-DKG coordinator | `& $PY scripts\spawn_keypers.py` | :5001-5003 |

Wait for each to print its "ready"/"Started on" line before starting the next.
The sequencer prints its relayer address, then
`[te-scheduler] started` (the auto-tally loop). The keyper launcher prints
`auto-DKG coordinator running`. Together these two background loops mean the
only thing you do by hand is sign in MetaMask.

Sanity check (PowerShell):
```powershell
Get-NetTCPConnection -State Listen -LocalPort 3000,3001,3306,8080,5001,5002,5003 |
  Select-Object LocalPort -Unique | Sort-Object LocalPort
```
You should see all seven ports.

---

## 2. Seed the space with YOUR MetaMask address

This is the **only** script you run, and only once per space (it just writes a
space row + dev limits to the DB). The `e2e-live.eth` space is already seeded
for `0xb511c3c0FCb6f0c3059B7c4de1D813f4841c591e`; to (re)create it or use your
own address:

```powershell
& $PY scripts\seed_space.py --admin 0xYOUR_METAMASK_ADDRESS --space e2e-live.eth --name "E2E Live"
```

This writes a **turbo** space (so Sepolia is allowed) with:
- `strategies: [ticket]` → voting power 1 for everyone,
- space-level `privacy: any` (the snapshot.js space schema does not permit
  `shutter-elgamal` at the space level — each proposal opts in instead),
- `validation: any` and you as the sole admin/member,
- generous `options` limits (otherwise the sequencer rejects with
  "proposal limit reached").

Re-run any time to reset; it's idempotent (`REPLACE INTO`).

---

## 3. Create the proposal in the browser

1. Open `http://localhost:8080/#/s-tn:e2e-live.eth`.
2. **Connect wallet** → MetaMask → make sure the active network is **Sepolia**
   and the active account is the one you seeded as admin.
3. Click **New proposal**.
4. Fill in:
   - Title: anything (e.g. `MetaMask private vote`).
   - Voting type: **Single choice**.
   - Choices: `Approve` and `Reject`.
   - Duration: set the end ~**3 minutes** out (or whatever you like — the space
     enforces no fixed period).
   - **Privacy: Permanent private** (the `shutter-elgamal` option from
     `SelectPrivacy.vue`).
5. **Publish** → MetaMask pops up an EIP-712 signature request (domain
   `snapshot` / version `0.1.4`). Sign it.
6. The proposal page opens.

If publish fails, check the sequencer terminal — the rejection reason is in
the `error_description`.

---

## 4. DKG runs automatically

Within ~2 seconds of publishing, the auto-DKG coordinator (in the keyper
terminal) prints `running DKG for 0x…` then `DKG complete — te_mpk set`. You do
nothing. Give it a few seconds, then **refresh** the proposal page so the
browser picks up the now-finalised threshold key before you vote.

---

## 5. Cast your private vote in the browser

1. With the page refreshed, pick **Approve** (or Reject) and **Vote**.
2. MetaMask pops up a second EIP-712 signature — this signs the **encrypted
   ElGamal ballot** (the plaintext choice never leaves your browser). Sign it.
3. The vote is accepted by the sequencer (`verifyTeBallot` checks the ballot
   proof and your pseudonym).

---

## 6. Tally finalises automatically when the proposal closes

When your ~3-minute window elapses, the sequencer's tally scheduler
(`[te-scheduler]` in the sequencer terminal) automatically:
- recomputes the homomorphic aggregate,
- nudges the keypers to publish their DLEQ-proven decryption shares,
- recovers and persists the final tally.

No script to run. Within ~5–10 seconds of close, **refresh** the proposal page:
1. The **Permanent private tally** panel shows the decrypted result
   (e.g. Approve 1 / Reject 0).
2. Click **Verify tally** → it recomputes from the on-record shares and shows
   **"Tally matches published scores."**

That green check is the same assertion the automated audit spec
(`tests/shutter-elgamal-audit-e2e.spec.ts`) makes — now produced by a real
MetaMask wallet end-to-end, fully hands-off.

> Want it faster than 3 minutes? Just set a shorter end time in step 3.
> The scheduler picks it up the moment the proposal is past its end.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `wrong proposal format` | Sequencer didn't load the privacy-schema patch — restart it (`bun run dev`) so `patchPrivacySchemas()` runs. |
| `proposal limit reached` | `options` table empty — re-run `seed_space.py` (seeds the limit rows). |
| `space is using a non-premium network` | Space isn't `turbo` — re-run `seed_space.py` (sets `turbo=1`). |
| `invalid space settings: wrong space format` | Don't hand-edit `settings`; let `seed_space.py` write it. |
| `Unknown column 'turbo'` | `ALTER TABLE spaces ADD COLUMN turbo int NOT NULL DEFAULT 0 AFTER hibernated;` |
| Vote button missing / "single-choice only" | `shutter-elgamal` supports single-choice ballots only. |
| Verify tally OOMs | BSGS upper bound = total voting power; keep the voter count tiny for local runs. |
| DKG never runs (`te_mpk` stays NULL) | Keyper terminal must show `auto-DKG coordinator running`; restart `spawn_keypers.py`. |
| Tally never finalises after close | Sequencer terminal must show `[te-scheduler] started`; restart the sequencer (`bun run dev`). |
