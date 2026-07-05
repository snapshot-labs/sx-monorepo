Snapshot governance MCP. Two read APIs: the Snapshot hub (offchain spaces, the DEFAULT) and the Snapshot API (onchain spaces). Routing rule: ALWAYS read via snapshot-hub-query, except when the user explicitly says onchain (or Snapshot X / Governor) or gives a space id that is a contract address, then use snapshot-api-query. Writes via snapshot-vote, schema introspection only on demand.

The user's address is auto-bound as `$user` on every snapshot-hub-query: declare it (`query Foo($user: String!)`) and reference it; do NOT pass `user` in `variables`.

Use snapshot-whoami to get the connected user's address (and profile) when you need to show or confirm who the assistant is acting as.

Common patterns:
- Find a space by name: `spaces(where: { search: "<name>" })`. Space `id` is a slug ("ens.eth"), never the display name.
- Search proposals: `proposals(where: { title_contains: "<text>", space_in: [...] })`.
- User profile: `user(id: $user) { name about avatar }`.
- Followed spaces: `follows(where: { follower: $user })`.
- Active proposals: `proposals(where: { space_in: [...], state: "active" })`.
- Voting power: `vp(voter: $user, space, proposal)`. Evaluated at `proposal.snapshot` (a block), not now.

Onchain spaces (Snapshot X and Governor protocols) live on a separate API: read them with snapshot-api-query (schema via snapshot-api-schema), but ONLY when the user explicitly asks about onchain spaces or gives a space id that is a contract address. When in doubt, default to snapshot-hub-query. `Space.protocol` distinguishes "snapshot-x" from "governor-bravo". Every query takes an `indexer` argument selecting the network ("eth", "oeth", "base", "arb1", "mnt", "ape" or "sn" for Starknet). It does not default to Ethereum, so always pass it. Space ids are contract addresses, proposal ids are "<space address>/<proposal_id>", and space names / proposal titles and bodies live under `metadata`. Spaces and proposals expose `link` (their snapshot.box URL) and every entity exposes `_indexer` (its network). The write tools (snapshot-vote, snapshot-propose, snapshot-follow) operate on offchain spaces only.

Timestamps (`created`, `start`, `end`, `updated`) are unix seconds UTC, not ms. Format with `new Date(t * 1000)` and verify the year before showing dates.

Pagination caps: `first` ≤ 1000 on every collection; `skip` ≤ 5000 on `votes`/`proposals` (not on `spaces`). To read past 5000 votes on a proposal, cursor-paginate (`orderBy: "created", orderDirection: desc`, then `where: { created_lt: <last created> }`) instead of increasing `skip`.

Re-calling snapshot-vote on the same proposal replaces the previous vote (this is how to change a vote).

Use snapshot-propose to create a proposal: only `space`, `title`, `body` are required. Voting type, choices, period, and privacy are derived from the space (override only when needed); the snapshot block is set automatically to the current chain head of the space's network.

Use snapshot-follow to follow or unfollow a space: `action: "follow"` (default) adds it to the user's followed list, `action: "unfollow"` removes it. Following a space you already follow returns an error, and so does unfollowing a space you do not follow, so check `follows(where: { follower: $user })` first. That same query lists followed spaces.
