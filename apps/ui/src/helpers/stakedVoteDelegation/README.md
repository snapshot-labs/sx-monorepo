# Staked STRK vote delegation (prototype)

UI for the draft SNIP
[Staked STRK Vote Delegation to Validators](https://github.com/starknet-innovation/staked-strk-vote-delegation/blob/main/snip/snip-staked-vote-delegation.md).
The page is at `/#/staking-delegation` on the Starknet organization
(governance.starknet.io), with a "Staking delegation" nav item.

## What it does

- **Delegators**: see which pools they stake in and who votes with each one,
  keep their own vote (`delegate(self)`), delegate to any address
  (`delegate(x)`), or go back to the default (`reset_delegation`).
- **Validators** (connected as the staker address): set a vote receiver
  (`set_vote_receiver`) and decline or accept default delegations
  (`set_accepts_default_delegations`).
- **Anyone**: look up how any address resolves, and browse validators with
  their live registry settings.

## Networks

| Network | Registry | Notes |
| --- | --- | --- |
| Sepolia (`sn-sep`, default) | `0x07c1db3e8a9137063d364c84c2175d323ed75b1a7e4fd457cca81aa99ecec55f` | `staked-strk-vote-delegation@e788c48`, class `0x053c2a87…01d81c` |
| Mainnet (`sn`) | not deployed | Set `registry` in `config.ts` once SNF publishes the address, then build with `VITE_STAKED_DELEGATION_NETWORK=sn` |

## Validator list

The staking contract cannot list validators, so `pools.<network>.json` is a
snapshot built from `NewDelegationPool` events plus `staker_pool_info` and
`get_staker_info_v1`. Regenerate it with:

```sh
cd apps/ui
node --experimental-strip-types scripts/generate-staking-pools.ts sn-sep <rpc-url>
node --experimental-strip-types scripts/generate-staking-pools.ts sn <rpc-url>
```

To find a connected wallet's pools, the page checks
`get_pool_member_info_v1` (falling back to `get_pool_member_info` on pools that
were never upgraded) on every pool with stake, 12 calls at a time.

## Run locally with the governance.starknet.io theme

```sh
cd apps/ui
VITE_WHITELABEL_MAPPING='localhost;;governance.starknet.io' \
VITE_ORGANIZATION_MAPPING='localhost;starknet' \
bun run dev
```

Then open http://localhost:8080/#/staking-delegation. Append
`?as=<starknet address>` to view the page as that address (read-only).
