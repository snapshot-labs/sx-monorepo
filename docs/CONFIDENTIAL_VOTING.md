# Confidential voting (Inco)

Snapshot X spaces deployed with the Inco-flavored `Space.sol` master keep individual voting choices encrypted on-chain. Per-choice tallies are also encrypted *while voting is open*. After the voting period ends, anyone can reveal the final per-choice counts (against/for/abstain), which are then public and used to settle the proposal on-chain.

This document describes how that flow is wired across `packages/sx.js`, `apps/api`, `apps/ui`, and `apps/mana`. The contracts live in [Inco-fhevm/snapshotx](https://github.com/Inco-fhevm/snapshotx) (branch `feat/inco-reveal-execute-split`), built against `@inco/lightning` v1.

## TL;DR

A confidential space is a regular Snapshot X space with a different `Space.sol` implementation:
- `vote(...)` takes `bytes ciphertext` instead of `uint8 choice`, and is **payable** — the voter forwards the per-vote Inco fee (`inco.getFee()`), which the authenticator relays via `msg.value`.
- `execute(...)` is preceded by a two-step **reveal**: `requestReveal(id)` → `finalizeReveal(id, TallyDecryption[3])`. `execute(id, payload)` then runs only if the proposal passed.
- New view methods expose the encrypted tally handles (`getVoteTallyHandles`) and the revealed result (`revealed`, `result`).
- Owner `withdraw(to, amount)` reclaims the Space's Inco fee float.
- Same `propose`, `cancel`, `updateProposal`, `initialize` ABIs.

The `confidential: true` flag on each space (per [Decision D1](#decision-d1-protocol-identifier)) tells the SDK and UI to swap to the Inco-flavored ABI and EIP-712 type. Every existing SX space stays on the legacy code path.

## Vote flow

```
┌───────┐ encrypt + fee     ┌──────────────────┐ vote(ciphertext)   ┌─────────┐
│ User  │ ────────────────► │ Inco SDK         │ ─────────────────► │ Space   │
│ (UI)  │ (browser-local,   │ (@inco/         │ (payable; sig or   │ (Inco)  │
└───────┘  no signature)    │  lightning-js)   │  tx auth, value=fee)└─────────┘
                            └──────────────────┘                         │
                                                                         │ emits
                                                                         ▼
                                                              VoteCast(uint256,
                                                                 address, uint256)
                                                                 ↑ no `choice`
```

1. UI lazy-imports `@/helpers/inco`, builds a viem `PublicClient` against Base Sepolia, calls `inco.encryptChoice({space, voter, choice})`. Encryption is bound to (`voter`, `space`) — the *voter* address, not `msg.sender`. That matters for `EthSigAuthenticator`, where `msg.sender` is the authenticator, not the voter.
2. UI reads the per-vote fee with `inco.getFee()` (from the Inco executor) and sets it on `Vote.fee`. The ciphertext goes on `Vote.ciphertext`. `sx.js`'s tx/sig clients auto-detect the ciphertext and switch to the `Space.inco.json` ABI + `voteTypesInco` EIP-712 type, and forward the fee as `msg.value` on the (now payable) `authenticate(...)` call.
3. On-chain, `Space.vote()` decodes the ciphertext into an `euint256`, runs encrypted comparisons against `0/1/2` (Against/For/Abstain), and uses encrypted `select` to add the encrypted voting power to one of three encrypted bucket totals (`votePower[id][0..2]`). The buckets get `allowThis()` only — **no EOA is granted decrypt access during voting**, so no one can read a running result.

## Reveal + execute flow

Reveal is split from execute and gated to after the voting period (`block.number >= maxEndBlockNumber`). It is **permissionless** — anyone can reveal once voting ends.

```
┌───────┐ requestReveal(id) ┌─────────┐   (grants caller decrypt ACL on the 3 tallies)
│ User  │ ────────────────► │ Space   │
│ (UI)  │ getVoteTallyHandles│ (Inco) │  attest decrypt   ┌────────────┐
└───────┘ ◄──────[a,f,ab]────┘         │ ────────────────►│ Inco TEE   │
   │ user signs typed-data ───────────────────────────────►│covalidator │
   │ ◄────────── 3×{handle, value, signatures} ────────────┘
   │ finalizeReveal(id, TallyDecryption[3])
   ▼
┌─────────┐ verifies each attestation + handle match, stores cleartext counts,
│ Space   │ computes quorum/support/passed on-chain, emits ProposalResultRevealed.
│ (Inco)  │ execute(id, payload) → runs only if revealed && passed.
└─────────┘
```

UI: [`apps/ui/src/networks/evm/actions.ts` `executeTransactions`](../apps/ui/src/networks/evm/actions.ts) orchestrates it — if not yet revealed, `client.requestReveal()` (mined) → `inco.decryptHandles` of the three tally handles → `client.finalizeReveal()` (mined) → then `client.execute()` only if the revealed result passed (a rejected proposal is already settled). Up to three wallet prompts: the typed-data decryption request, then the `finalizeReveal` and `execute` txs.

`TallyDecryption` is `{ (bytes32 handle, bytes32 value) attestation; bytes[] signatures }`, passed as a fixed `[3]` array indexed `[against, for, abstain]`.

## ACL model

Inco's `e.allow(handle, account)` controls who can request decryption of a handle.

- During `vote()` / `propose()`: the encrypted tally buckets get `allowThis()` only — **no EOA can decrypt while voting is open**.
- `requestReveal(id)` (only after `maxEndBlockNumber`) grants `msg.sender` decrypt access to the three now-frozen tally handles. Since voting has ended, this cannot leak a running result.

Reveal is therefore permissionless and the final counts are meant to be public. The Mana relayer is still kept out of the confidential path (see [Decision O3](#decision-o3-mana-relayer)) — the UI reveals/executes with the user's signer directly.

## Indexer behavior

The Inco `VoteCast(uint256, address, uint256)` and the legacy `VoteCast(uint256, address, uint8, uint256)` have different topic-0 hashes — both are subscribed on the same `Space` template. Routing happens in [`apps/api/src/evm/protocols/snapshot-x/config.ts`](../apps/api/src/evm/protocols/snapshot-x/config.ts):

| Event topic-0 | Handler | Behavior |
|---|---|---|
| `VoteCast(uint256,address,uint8,uint256)` | `handleVoteCast` | Updates `proposal.scores_${choice}` (legacy plaintext flow) |
| `VoteCast(uint256,address,uint256)` | `handleConfidentialVoteCast` | Skips per-choice updates; sets `space.confidential = true`; `vote.choice = 0` (sentinel) |
| `ProposalResultRevealed(uint256,uint256,uint256,uint256,bool)` | `handleProposalResultRevealed` | Writes the now-public per-choice counts and the verdict (see below); marks the tally `completed` |
| `ProposalExecuted(uint256)` | `handleProposalExecuted` | For confidential spaces, settles execution (`execution_settled`, `completed`, `executed_at`) — the Vanilla executor singleton has no `ExecutionStrategy` entity, so this is set explicitly |

`handleProposalResultRevealed` maps the contract's choice indices (0=Against, 1=For, 2=Abstain) onto Snapshot's score buckets (`scores_1`=For, `scores_2`=Against, `scores_3`=Abstain), and recomputes `is_support_achieved = for > against` and `is_quorum_reached = (for + abstain) >= quorum`.

The schema additions are nullable + additive:
- `Space.confidential: Boolean` (null/false = legacy)
- `Proposal.is_quorum_reached: Boolean` (null until revealed)
- `Proposal.is_support_achieved: Boolean` (null until revealed)

## SDK shape

`@snapshot-labs/sx` exports an `inco` namespace:

```ts
import { inco } from '@snapshot-labs/sx';

const zap = await inco.getZap();                       // Lightning.baseSepoliaTestnet()
const fee = await inco.getFee({ zap, publicClient });  // per-vote msg.value
const ciphertext = await inco.encryptChoice({ zap, space, voter, choice: 1n });

// After requestReveal grants decrypt access to the three tally handles:
const tallies = await inco.decryptHandles({ zap, walletClient, handles }); // [against, for, abstain]
// → [{ handle, value, attestation: {handle, value}, signatures }, ...]
```

`@inco/lightning-js` (the v1 rename of `@inco/js`) is declared as an *optional* peerDependency. The `inco.*` helpers dynamic-import it on first call, so consumers of sx.js that never touch confidential voting don't pay the bundle cost.

## Reference deployment (Base Sepolia, chainId 84532)

Deployed via [`snapshotx/script/DeployIncoStack.s.sol`](https://github.com/Inco-fhevm/snapshotx) against `@inco/lightning` v1 at block `42969459` (EIP-712 domain `("snapshot-x", "1.0.0")`).

| Contract | Address |
|---|---|
| `ProxyFactory` | `0xfDe801CFc7f9a931eB1CF026e60B08a366B13494` |
| Master `Space` | `0x3F31D742D3158b07434A041e26B47e9EB94e010C` |
| `EthSigAuthenticator` | `0x69A9c5626860f53f9b4fD5F2936d74eC93417677` |
| `EthTxAuthenticator` | `0x9376EFC993DC6Ac09044300f26e015890bf97C17` |
| `VanillaVotingStrategy` | `0xc501B2057E60CfD31559e4FD1e3134aF0BA9C673` |
| `VanillaProposalValidationStrategy` | `0x8141C869D63f41Fd6759c12e2fDA019E3b9A28C6` |
| `VanillaExecutionStrategy` | `0xe03ED076c98095BDE288Cb78730365786e2Caab3` |

Inco executor (chain-wide v1 deployment, not deployed by us): `0x4b9911b0191B0b6a6eA8F2Ed562e20Cff5AC8624`. This is the same executor `@inco/lightning-js` v1 targets — the contracts must be on `@inco/lightning` v1 so encryption (SDK) and decryption (contract) share it.

## Decisions and open questions

### Decision D1: Protocol identifier

At the data layer, a per-space `confidential: boolean` flag on the existing `snapshot-x` protocol — *not* a new on-chain protocol. Schema impact is one nullable column; only `vote` and `executeTransactions` actions branch.

For the create/explore UX, there is *also* a UI-only protocol, **`incoXsnapshotx`** (`apps/ui/src/networks/index.ts`), mapped to the `basesep` network with its own create page (`/create/incoXsnapshotx`, network locked to basesep). It's gated to when basesep is opted into `VITE_ENABLED_NETWORKS`. This is purely a frontend surface — spaces it creates are ordinary `snapshot-x` spaces with `confidential = true`.

### Decision D2: Per-choice tally reveal

Per-choice counts are **public after reveal**. `finalizeReveal` posts the cleartext against/for/abstain counts on-chain and the UI renders them as normal result bars once revealed. (This supersedes the earlier "forever-private" design — the reveal/execute split exists specifically to make the result public and verifiable while keeping choices private *during* voting.)

Small-anonymity-set caveat: revealing exact counts with 1–2 voters can expose individual choices. Inherent to "public after voting"; flagged for the Snapshot team.

### Decision O3: Mana relayer

The confidential vote is payable and reveal is the user's own signed flow, so v1 keeps Mana out of the confidential path entirely — the UI votes/reveals/executes with the user's signer directly. Mana's `NETWORKS` map intentionally omits Base Sepolia; [`apps/mana/src/eth/rpc.ts`](../apps/mana/src/eth/rpc.ts) filters `NETWORK_IDS` to the chains in `NETWORKS` so the basesep entry in sx.js's `evmNetworks` doesn't crash Mana's startup with "Unsupported chainId".

### Resolved: reveal trigger

Earlier this was an open question (only the proposal author could trigger the fused `tryExecute`). The reveal/execute split makes reveal **permissionless after voting ends** — any address can `requestReveal`/`finalizeReveal`, since the result is public by design. No owner-specific ACL needed.

## What this PR does

- **Contract changes** (Inco fork): reveal/execute split, payable voter-pays `vote()`, public per-choice reveal, owner `withdraw`, on `@inco/lightning` v1. Audit is the Snapshot team's call.
- **No vote-modal copy changes**: the modal still says "For/Against/Abstain". "Your vote will be encrypted" copy is non-blocking polish.
- The `Reveal & execute` button in `Overview.vue` is marked **DEMO ONLY** — it should move into `ProposalExecutionsList` before merge.

## Files touched

sx.js: `clients/evm/ethereum-tx/abis/Space.inco.json`, `inco/index.ts`, `clients/evm/ethereum-tx/index.ts`, `clients/evm/ethereum-sig/{index,types}.ts`, `clients/evm/types.ts`, `evmNetworks.ts`, `authenticators/evm/abis/{EthSig,EthTx,Vanilla}Authenticator.json` (payable), `test/unit/inco.test.ts`, `package.json`.

api: `schema.gql`, `evm/{types,config,index}.ts`, `evm/protocols/snapshot-x/{abis/Space.ts,config.ts,writers.ts}`.

ui: `helpers/inco.ts`, `networks/evm/actions.ts`, `networks/common/graphqlApi/{queries,index}.ts`, `networks/{index,types}.ts`, `views/CreateSpaceSnapshotX.vue`, `views/Proposal/Overview.vue`, `components/ProposalResults.vue`, `routes/default.ts`, `helpers/constants.ts`, `types.ts`, `main.ts`, `vite.config.ts`.

mana: `eth/rpc.ts`.
