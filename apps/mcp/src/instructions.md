Snapshot governance MCP. Two read APIs: the Snapshot hub (offchain spaces, the DEFAULT) and the Snapshot API (onchain spaces). Routing rule: ALWAYS read via snapshot-hub-query, except when the user explicitly says onchain (or Snapshot X / Governor) or gives a space id that is a contract address, then use snapshot-api-query. Writes via snapshot-vote, schema introspection only on demand.

The user's address is auto-bound as `$user` on every snapshot-hub-query: declare it (`query Foo($user: String!)`) and reference it; do NOT pass `user` in `variables`.

Use snapshot-whoami to get the connected user's address (and profile) when you need to show or confirm who the assistant is acting as.

Recipes (copy and adapt; wrap any `$user` query as `query ($user: String!) { … }`). Hub queries — snapshot-hub-query, offchain, space ids are slugs like "ens.eth":
- Find a space by name: `spaces(where: { search: "ens" }) { id name }`
- Active proposals in a space: `proposals(where: { space: "ens.eth", state: "active" }, orderBy: "created", orderDirection: desc) { id title }`
- Did a proposal pass: `proposal(id: "0x…") { title state choices scores scores_total quorum }` (state is "pending" / "active" / "closed")
- My voting power on a proposal: `vp(voter: $user, space: "ens.eth", proposal: "0x…") { vp }` (evaluated at the proposal's snapshot block, not now)
- My vote history: `votes(where: { voter: $user }, orderBy: "created", orderDirection: desc) { proposal { id title } choice created }`
- Spaces I follow: `follows(where: { follower: $user }) { space { id name } }`
- A user's profile: `user(id: $user) { name about votesCount proposalsCount }`

Snapshot API queries — snapshot-api-query, onchain; always pass `indexer`, and `orderBy` is an unquoted enum:
- Latest proposals in an onchain space: `proposals(indexer: "eth", where: { space: "0x…" }, orderBy: created, orderDirection: desc) { id metadata { title } scores_total_parsed vote_count max_end }`
- An onchain proposal's outcome (there is no `state` field): `proposal(indexer: "eth", id: "0x…/98") { metadata { title } scores_total_parsed quorum completed executed }`
- Find onchain spaces by protocol: `spaces(indexer: "eth", where: { protocol: "snapshot-x" }) { id metadata { name } }` (or "governor-bravo")
- A user's onchain activity: `leaderboards(indexer: "eth", where: { user: $user }) { space { id } proposal_count vote_count }`

Onchain spaces (Snapshot X and Governor protocols) live on a separate API: read them with snapshot-api-query (schema via snapshot-api-schema), but ONLY when the user explicitly asks about onchain spaces or gives a space id that is a contract address. When in doubt, default to snapshot-hub-query. `Space.protocol` distinguishes "snapshot-x" from "governor-bravo". Every query takes an `indexer` argument selecting the network ("eth", "oeth", "base", "arb1", "mnt", "ape" or "sn" for Starknet). It does not default to Ethereum, so always pass it. Space ids are contract addresses, proposal ids are "<space address>/<proposal_id>", and space names / proposal titles and bodies live under `metadata`. Filtering: `where` takes any scalar field, exact or with a suffix `_gt`, `_gte`, `_lt`, `_lte`, `_in`, `_not`, `_not_in`, `_contains`, `_contains_nocase`; filter by a related entity via its id/address scalar (e.g. `space`, `author`), not a nested object; order with `orderBy: created` (an UNQUOTED enum field name, never a quoted string) and `orderDirection: desc`. Note the hub is the opposite: its `orderBy` is a QUOTED string (`orderBy: "created"`). Spaces and proposals expose `link` (their snapshot.box URL) and every entity exposes `_indexer` (its network). The write tools (snapshot-vote, snapshot-propose, snapshot-follow) operate on offchain spaces only.

When a query errors, read the message: it names the offending field or argument. Fix it and retry once; if a field or filter name is unknown, call the matching schema tool to find the correct name rather than retrying variations blindly.

Timestamps (`created`, `start`, `end`, `updated`) are unix seconds UTC, not ms. Format with `new Date(t * 1000)` and verify the year before showing dates.

Pagination caps: `first` ≤ 1000 on every collection; `skip` ≤ 5000 on `votes`/`proposals` (not on `spaces`). To read past 5000 votes on a proposal, cursor-paginate (`orderBy: "created", orderDirection: desc`, then `where: { created_lt: <last created> }`) instead of increasing `skip`.

Re-calling snapshot-vote on the same proposal replaces the previous vote (this is how to change a vote).

Use snapshot-propose to create a proposal: only `space`, `title`, `body` are required. Voting type, choices, period, and privacy are derived from the space (override only when needed); the snapshot block is set automatically to the current chain head of the space's network.

Use snapshot-follow to follow or unfollow a space: `action: "follow"` (default) adds it to the user's followed list, `action: "unfollow"` removes it. Following a space you already follow returns an error, and so does unfollowing a space you do not follow, so check `follows(where: { follower: $user })` first. That same query lists followed spaces.
