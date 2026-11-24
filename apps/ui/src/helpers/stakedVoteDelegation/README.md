# Staked STRK vote delegation (prototype)

UI for the draft SNIP
[Staked STRK Vote Delegation to Validators](https://github.com/starknet-innovation/staked-strk-vote-delegation/blob/main/snip/snip-staked-vote-delegation.md).
The page is at `/#/delegation` on the Starknet organization
(governance.starknet.io), with a "Delegation" nav item. The existing
"Delegates" nav item is hidden for Starknet.

## What it does

- **Delegators**: see which pools they stake in and who votes with each one,
  keep their own vote (`delegate(self)`), delegate to any address
  (`delegate(x)`), or go back to the default (`reset_delegation`).
- **Validators** (connected as the staker address): set a vote receiver
  (`set_vote_receiver`) and decline or accept default delegations
  (`set_accepts_default_delegations`).
- **Anyone**: look up how any address resolves, and browse validators with
  their live registry settings.
- **Voting record**: how each validator's voting address voted on the 6 most
  recent Starknet votes (Snapshot X) and polls (`starknet.eth`), from the
  Snapshot X API and the Snapshot hub (`votingRecord.ts`). Mainnet
  governance data, so Sepolia validators show 0/6 unless fixtures are on.
- **When your choice counts**: open votes and polls, and a preview of who
  votes with your stake before you save.

## Validator profiles

Names, logos, websites and a short "about" come from
[`validatorProfiles.ts`](validatorProfiles.ts), keyed by staker address.
Validators add themselves with a pull request:

```ts
'0x0123…': {
  name: 'Example Validator',
  logo: 'https://example.com/logo.png',
  website: 'https://example.com',
  about: 'Who runs it and how it approaches governance votes.',
  verified: true // only after SNF confirms the staker address
}
```

Without a profile, the page falls back to the validator's Starknet ID name,
then to the shortened address. The list starts empty; Voyager's validator
data needs a paid API key and a server-side proxy (see the project notes).

## Speed

Finding a wallet's pools checks every pool with stake, so the first lookup
takes a few seconds. The result is kept in the browser and shown instantly
on later visits while a fresh check runs ("Checking for changes…").

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

Then open http://localhost:8080/#/delegation. Append
`?as=<starknet address>` to view the page as that address (read-only: options
can be explored, saving is disabled).

### Test fixtures (local only)

Add `VITE_STAKED_DELEGATION_FIXTURES=true` to the command above to load
`fixtures.ts`. Fixtures only fake staking state (pool membership, validator
status); the registry is still read and written live on Sepolia. They are
ignored in production builds.

| Address | What you see |
| --- | --- |
| `0x03a22b…e931` | Delegator with 23,500 STRK across 4 validators, one in each "votes with" state |
| `0x0378b9…f014` | Validator: 250k self-stake, 4.82M delegated, settings tab |

Two fixture validators are Sepolia accounts with real registry entries:
`0x032cca…cf38` declined default delegations and `0x040854…c6e6` set a vote
receiver (`0x025f52…3a85`).
