# Confidential voting (Inco)

Snapshot X spaces deployed with the Inco-flavored `Space.sol` master keep individual voting choices encrypted on-chain. Per-choice tallies are also encrypted. Only the final pass/fail flags (`quorumReached`, `supportAchieved`) are revealed during proposal execution.

This document describes how that flow is wired across `packages/sx.js`, `apps/api`, `apps/ui`, and `apps/mana`. The contracts live in [snapshot-labs/sx-evm](https://github.com/snapshot-labs/sx-evm) (modified fork on Inco's branch).

## TL;DR

A confidential space is a regular Snapshot X space with a different `Space.sol` implementation:
- `vote(...)` takes `bytes ciphertext` instead of `uint8 choice`
- `execute(...)` is replaced with `tryExecute(...)` which verifies attested decryptions
- New view methods expose the encrypted decision-flag handles
- Same `propose`, `cancel`, `updateProposal`, `initialize` ABIs

The `confidential: true` flag on each space (per [Decision D1](#decision-d1-protocol-identifier) below) tells the SDK and UI to swap to the Inco-flavored ABI and EIP-712 type. Every existing SX space stays on the legacy code path.

## Vote flow

```
┌───────┐  encrypt           ┌────────────┐  vote(ciphertext)   ┌─────────┐
│ User  │ ─────────────────► │ Inco SDK   │ ─────────────────► │ Space   │
│ (UI)  │  (browser-local,   │ (@inco/js) │ (sig or tx auth)   │ (Inco)  │
└───────┘   no signature)    └────────────┘                     └─────────┘
                                                                     │
                                                                     │  emits
                                                                     ▼
                                                           VoteCast(uint256,
                                                              address, uint256)
                                                              ↑ no `choice`
```

1. UI lazy-imports `@/helpers/inco`, builds a viem `PublicClient` against Base Sepolia, calls `inco.encryptChoice({space, voter, choice})`. Encryption is bound to (`voter`, `space`) — note: the *voter* address, not `msg.sender`. That matters for `EthSigAuthenticator`, where `msg.sender` is the authenticator, not the voter.
2. The ciphertext is set on `Vote.ciphertext`. `sx.js`'s tx and sig clients [auto-detect this and switch](../packages/sx.js/src/clients/evm/ethereum-tx/index.ts#L555) to `Space.inco.json` ABI + `voteTypesInco` EIP-712 type.
3. On-chain, `Space.vote()` decodes the ciphertext into an `euint256`, runs encrypted comparisons against `0/1/2` (Against/For/Abstain), and uses encrypted `select` to add the encrypted voting power to the right of three encrypted bucket totals. Nothing about the choice is observable.
4. After updating buckets, the contract recomputes encrypted `quorumReached = (For + Abstain) ≥ quorum` and `supportAchieved = For > Against`, and stores the resulting handles in `encryptedIsQuorumReached[id]` and `encryptedIsSupportAchieved[id]`.

## Execute flow (`tryExecute`)

```
┌───────┐                   ┌─────────┐                   ┌────────────┐
│ User  │ getQ&S handles    │ Space   │  attest decrypt   │ Inco TEE   │
│ (UI)  │ ────────────────► │ (Inco)  │ ────────────────► │covalidator │
└───────┘                   └─────────┘                   └────────────┘
   ▼                                                               │
   │ user signs typed-data ──────────────────────────────────────►│
   │                                                               │
   │ ◄────────────── {handle, value, signatures} ────────────────┘
   │
   │ tryExecute(id, payload, qAttest, qSigs, sAttest, sSigs)
   ▼
┌─────────┐
│ Space   │  verifies sigs, checks handle match, decodes booleans,
│ (Inco)  │  if both true: stores `is*Reached` + finalizes proposal
└─────────┘
```

UI: [`apps/ui/src/networks/evm/actions.ts` `executeTransactions`](../apps/ui/src/networks/evm/actions.ts) — calls `decryptDecisionFlags` then `client.tryExecute`. Two MetaMask prompts: one for the typed-data decryption request, one for the on-chain `tryExecute` tx.

## ACL model

Inco's `e.allow(handle, account)` controls who can request decryption of a handle. The Space contract grants ACL during `vote()` and `propose()`:

| Handle | Granted to |
|---|---|
| `encryptedIsQuorumReached[id]` | Space, `msg.sender` (= authenticator), `proposal.author`, voter |
| `encryptedIsSupportAchieved[id]` | (same) |
| `votePower[id][choice]` (encrypted bucket totals) | Space, voter, `proposal.executionStrategy` |

**Therefore, only the proposal author or a voter can call `tryExecute`** for the v1 demo deployment. The Mana relayer wallet has no decrypt rights, so the UI bypasses the Mana fast-path for confidential proposals (see [Decision O3](#decision-o3-mana-relayer)).

## Indexer behavior

The Inco `VoteCast(uint256, address, uint256)` and the legacy `VoteCast(uint256, address, uint8, uint256)` have different topic-0 hashes — both are subscribed to on the same `Space` template. Routing happens in [`apps/api/src/evm/protocols/snapshot-x/config.ts`](../apps/api/src/evm/protocols/snapshot-x/config.ts):

| Event topic-0 | Handler | Behavior |
|---|---|---|
| `VoteCast(uint256,address,uint8,uint256)` | `handleVoteCast` | Updates `proposal.scores_${choice}` (legacy plaintext flow) |
| `VoteCast(uint256,address,uint256)` | `handleConfidentialVoteCast` | Skips per-choice updates; sets `space.confidential = true`; `vote.choice = 0` (sentinel) |
| `ProposalExecuted(uint256)` | `handleProposalExecuted` | If `space.confidential`, additionally reads `isQuorumReached`/`isSupportAchieved` and writes them to `Proposal.is_quorum_reached`/`is_support_achieved` |

The schema additions are nullable + additive:
- `Space.confidential: Boolean` (null/false = legacy)
- `Proposal.is_quorum_reached: Boolean` (null until executed)
- `Proposal.is_support_achieved: Boolean` (null until executed)

## SDK shape

`@snapshot-labs/sx` exports a new `inco` namespace:

```ts
import { inco } from '@snapshot-labs/sx';

const zap = await inco.getZap(viemPublicClient);
const ciphertext = await inco.encryptChoice({ zap, space, voter, choice: 1n });

const results = await inco.decryptHandles({ zap, walletClient, handles });
// → [{ handle, value, attestation: {handle, value}, signatures }]
```

`@inco/js` is declared as an *optional* peerDependency. The `inco.*` helpers dynamic-import it on first call, so consumers of sx.js that never touch confidential voting don't pay the bundle cost.

## Reference deployment (Base Sepolia, chainId 84532)

| Contract | Address | Note |
|---|---|---|
| `ProxyFactory` | `0x06a0c3B26C13B444fEdb3B2988892E359dCb8B06` | Inco-flavored proxy factory |
| Master `Space` | `0xcb8eB47d52286c0fc1B5A0F4e0720f2E7db077Ac` | Demo space, also the master implementation |
| `EthTxAuthenticator` | `0x67a7d86F6c8B3E7FF3063D26A28D58e989850e4D` | |
| `EthSigAuthenticator` | `0x009ABB61d7E868aEf944F133Ca104e24FC3D5162` | |
| `VanillaVotingStrategy` | `0x5513d0e1b3E273d9373f3D4Cfbb8f1940556EDd2` | |
| `VanillaProposalValidationStrategy` | `0x18aE195EaA8E8D9Cc387CC13Db5727357BF9f4d7` | |
| `VanillaExecutionStrategy` | `0x7Ddcb1F2Ca1b1079Ad4BeeA2aDD0A7D792e16143` | |

Inco executor (chain-wide, not deployed by us): `0x168FDc3Ae19A5d5b03614578C58974FF30FCBe92`.

## Decisions and open questions

These are documented inline in the diff and called out here for reviewer attention.

### Decision D1: Protocol identifier

A per-space `confidential: boolean` flag on the existing `snapshot-x` protocol — *not* a new `snapshot-x-inco` protocol. Reasons:
- Schema impact is one nullable column instead of a new GraphQL union member.
- Most UI code paths are unaffected; only `vote` and `executeTransactions` actions branch.
- Keeps the door open for non-Inco confidential variants in the future without re-shaping again.

### Decision D2: Per-choice tally reveal

For v1: **forever-private**. Only the pass/fail booleans decrypt. The encrypted per-choice tally handles are stored on-chain forever and could be decrypted later by a contract upgrade if Snapshot decides scores need to be visible post-execution. Adding a `revealTallies(...)` flow would need three more attested decryptions and is left for a follow-up.

### Decision O3: Mana relayer

The on-chain ACL granted in `vote()` (Space, `msg.sender`, `proposal.author`, voter) does not include the Mana relayer wallet. Two ways to enable Mana:

1. Patch `Space.sol` to also `.allow(owner())` or a configurable relayer address.
2. Pass a Mana-signed delegate that the user authorizes during `propose()`.

Both are contract-level changes. v1 keeps Mana out of the confidential path entirely — UI calls `tryExecute` directly with the user's signer. Mana's [`apps/mana/src/eth/rpc.ts`](../apps/mana/src/eth/rpc.ts) doesn't list Base Sepolia in `NETWORKS`, so any stray request gets rejected with "Unsupported chainId".

### Open question: Space owner trigger

`tryExecute` is currently callable by any address with decrypt ACL. In practice that's the proposal author and voters. If a Space wants its `owner()` to be the canonical executor, the contract needs `.allow(owner())` on the encrypted decision-flag handles in both `propose()` and `vote()`. **Flagged for the Snapshot team to decide.**

## What this PR does *not* do

- **No contract changes**: the contracts are imported from the Inco fork as-is. Audit is the Snapshot team's call.
- **No UI copy / branding changes**: the vote modal still says "For/Against/Abstain". Adding "your vote will be encrypted" copy is non-blocking polish.
- **No "create confidential space" wizard polish**: `createSpace` works because the factory is real, but UX choices (default the Vanilla strategies on Base Sepolia, restrict execution-strategy options to ones that work with Inco, etc.) are deliberately left for a follow-up so the diff stays focused on the wire flow.

## Files touched

- `packages/sx.js/src/clients/evm/ethereum-tx/abis/Space.inco.json` (new)
- `packages/sx.js/src/inco/index.ts` (new)
- `packages/sx.js/src/clients/evm/ethereum-tx/index.ts`
- `packages/sx.js/src/clients/evm/ethereum-sig/index.ts`
- `packages/sx.js/src/clients/evm/ethereum-sig/types.ts`
- `packages/sx.js/src/clients/evm/types.ts`
- `packages/sx.js/src/evmNetworks.ts`
- `packages/sx.js/src/index.ts`
- `packages/sx.js/test/unit/inco.test.ts` (new)
- `apps/api/src/schema.gql`
- `apps/api/src/evm/types.ts`
- `apps/api/src/evm/config.ts`
- `apps/api/src/evm/index.ts`
- `apps/api/src/evm/protocols/snapshot-x/abis/Space.ts`
- `apps/api/src/evm/protocols/snapshot-x/config.ts`
- `apps/api/src/evm/protocols/snapshot-x/writers.ts`
- `apps/ui/src/helpers/inco.ts` (new)
- `apps/ui/src/networks/evm/actions.ts`
- `apps/ui/src/networks/common/graphqlApi/queries.ts`
- `apps/ui/src/networks/common/graphqlApi/index.ts`
- `apps/ui/src/types.ts`
- `apps/mana/src/eth/rpc.ts` (comment only)
