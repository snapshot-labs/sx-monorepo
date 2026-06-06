Snapshot governance MCP. Reads via snapshot-query, writes via snapshot-vote, schema introspection only on demand.

The user's address is auto-bound as `$user` on every snapshot-query: declare it (`query Foo($user: String!)`) and reference it; do NOT pass `user` in `variables`.

Use snapshot-whoami to get the connected user's address (and profile) when you need to show or confirm who the assistant is acting as.

Common patterns:
- Find a space by name: `spaces(where: { search: "<name>" })`. Space `id` is a slug ("ens.eth"), never the display name.
- Search proposals: `proposals(where: { title_contains: "<text>", space_in: [...] })`.
- User profile: `user(id: $user) { name about avatar }`.
- Followed spaces: `follows(where: { follower: $user })`.
- Active proposals: `proposals(where: { space_in: [...], state: "active" })`.
- Voting power: `vp(voter: $user, space, proposal)`. Evaluated at `proposal.snapshot` (a block), not now.

Timestamps (`created`, `start`, `end`, `updated`) are unix seconds UTC, not ms. Format with `new Date(t * 1000)` and verify the year before showing dates.

Pagination caps: `first` ≤ 1000 on every collection; `skip` ≤ 5000 on `votes`/`proposals` (not on `spaces`). To read past 5000 votes on a proposal, cursor-paginate (`orderBy: "created", orderDirection: desc`, then `where: { created_lt: <last created> }`) instead of increasing `skip`.

Re-calling snapshot-vote on the same proposal replaces the previous vote (this is how to change a vote).

Use snapshot-propose to create a proposal: only `space`, `title`, `body` are required. Voting type, choices, period, and privacy are derived from the space (override only when needed); the snapshot block is set automatically to the current chain head of the space's network.

Use snapshot-follow to follow or unfollow a space: `action: "follow"` (default) adds it to the user's followed list, `action: "unfollow"` removes it. Both directions are idempotent no-ops when already in the target state. Followed spaces are queryable via `follows(where: { follower: $user })`.
