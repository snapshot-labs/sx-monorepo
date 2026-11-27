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
  Snapshot X API and the Snapshot hub (`votingRecord.ts`), for the spaces
  listed in Starknet's organization config.
- **When your choice counts**: open votes and polls, and a preview of who
  votes with your stake before you save.

## Validators dashboard

Columns: staking power (share of all STRK stake), stake (self-stake +
delegated, STRK only), commission, uptime, governance record, and the
connected wallet's stake. Every column sorts, and "Your validators" filters
to the validators the wallet stakes with. Rows link to Look up; on wide
screens a Stake / Manage button opens the validator on Voyager.

- **Stake, commission** come from `staker_pool_info` / `get_staker_info_v1`
  at the block in `pools.<network>.json`.
- **Uptime** is the share of epochs in the last 30 days in which the
  validator attested (`StakerAttestationSuccessful` events of the
  attestation contract). The denominator is the number of epochs seen in the
  window, so validators that joined recently read lower than they are.
- **Defaults, vote receivers and records** are read live.

## Validator profiles

Validators publish their own profile as their **Snapshot profile** (name,
picture, description, X, GitHub), signed by the staker wallet: the "Public
profile" row in Validator settings opens Snapshot's Edit profile dialog.
Nothing is stored by this app: Snapshot keeps the profile (pictures on IPFS).

Pictures come from Snapshot's avatar service (`UiStamp`): the Snapshot
profile picture, else the Starknet ID profile picture (an NFT the owner
picked), else a generated pattern.

Names: an SNF override in [`validatorProfiles.ts`](validatorProfiles.ts),
else the Snapshot profile name, else the Starknet ID (`.stark`) name, else
the shortened address.

`validatorProfiles.ts` is only for what SNF vouches for, keyed by staker
address:

```ts
'0x0123…': {
  name: 'Example Validator', // optional override
  website: 'https://example.com',
  about: 'Who runs it and how it approaches governance votes.',
  verified: true // only after SNF confirms the staker address
}
```

## Speed

Finding a wallet's pools uses the multicall contract (`aggregate` at
`0x05754af3…87f4`, same address on mainnet and Sepolia): every listed pool is
checked in batches of 100 per request, then the found validators' registry
settings in one more request. On Sepolia that is ~1–2 s for 179 pools,
depending on the RPC. If a batch fails, it falls back to one request per
pool. The result is also kept in the browser and shown instantly on later
visits while a fresh check runs ("Checking for changes…").

Pools are checked even if they were empty when the list was generated, but
validators that registered after the list was generated are not known:
regenerate `pools.<network>.json` before launch and periodically after.

## Networks

The page uses the network of Starknet's Snapshot X space, as listed in
`helpers/organizations/config.ts` (`sn`, mainnet), the same way the rest of
the app takes a network from each space. `config.ts` holds the settings for
each Starknet network side by side, like `networks/starknet/metadata.ts`.

| Network | Registry | Notes |
| --- | --- | --- |
| Mainnet (`sn`) | not deployed | Set `registry` in `config.ts` once SNF publishes the address |
| Sepolia (`sn-sep`) | `0x07c1db3e8a9137063d364c84c2175d323ed75b1a7e4fd457cca81aa99ecec55f` | `staked-strk-vote-delegation@e788c48`, class `0x053c2a87…01d81c` |

## Validator list

The staking contract cannot list validators, so `pools.<network>.json` is a
snapshot built from `NewDelegationPool` events plus `staker_pool_info` and
`get_staker_info_v1`. Regenerate it with:

```sh
cd apps/ui
node --experimental-strip-types scripts/generate-staking-pools.ts sn-sep <rpc-url>
node --experimental-strip-types scripts/generate-staking-pools.ts sn <rpc-url>
```

Use the Starknet nodes RPC, not the app's shared one: a mainnet run reads
every `NewDelegationPool` event since genesis plus 30 days of attestation
events, and public endpoints rate-limit it.

- Mainnet: `https://mainnet.nodes.starknet.org/rpc/v0_9`
- Sepolia: `https://sepolia.nodes.starknet.org/rpc/v0_9`

To find a connected wallet's pools, the page calls `get_pool_member_info_v1`
on every listed pool (see Speed).

## Run locally

Use the app's usual organization mapping:

```sh
cd apps/ui
VITE_WHITELABEL_MAPPING='localhost' \
VITE_ORGANIZATION_MAPPING='localhost;starknet' \
bun run dev
```

Then open http://localhost:8080/#/delegation. Append
`?as=<starknet address>` to view the page as that address (read-only: options
can be explored, saving is disabled).

### Testing on Sepolia

Until the mainnet registry is deployed, test against the Sepolia registry by
changing the network of Starknet's Snapshot X space in
`helpers/organizations/config.ts` from `sn` to `sn-sep` on your machine. Do
not commit that change. The org's vote space and voting records then come
from Sepolia and are empty; delegation, validator settings and look-up work
against the Sepolia registry and staking contract.

The Validator settings tab appears for addresses that are stakers in the
Sepolia staking contract.
