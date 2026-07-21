![loc](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fghloc.ifels.dev%2Fsnapshot-labs%2Fsx-monorepo%2Fmaster%3Fmatch%3Dapps%2Fmcp%2Fsrc%26filter%3D.json%2C.scss%2C.svg%2C.snap%2C.gql%2C.md%2C.yml%2C.png%2C.mp4%2C.css%2C.html%2C.woff2%2C.gif%2C.jpg%2C.toml%2C.txt%2C.mdx%2C.sql%2C.icns%2C.ico&query=%24.loc&label=loc&color=blue)

# Snapshot MCP

A [Model Context Protocol](https://modelcontextprotocol.io) server for [Snapshot](https://snapshot.box). Lets AI assistants read governance data (spaces, proposals, votes, voting power) and act on the user's behalf (cast votes, create proposals, follow spaces) through Snapshot's GraphQL APIs. Available as a hosted endpoint at `https://mcp.snapshot.box`, or self-hostable.

## Tools

Snapshot has two GraphQL read APIs. The hub (`snapshot-hub-*`, offchain spaces) is the default: assistants use it unless the user explicitly asks about onchain spaces. The Snapshot API (`snapshot-api-*`) covers onchain spaces only (Snapshot X and Governor).

### `snapshot-hub-query`

Runs any GraphQL query against the Snapshot hub API (offchain spaces). The user's address is auto-bound as `$user` — declare it in the query and reference it; do not pass it in `variables`.

| Input | Type | Description |
|-------|------|-------------|
| `query` | `string` | GraphQL query string |
| `variables` | `object?` | GraphQL variables |

**Example — fetch active proposals for a space:**
```graphql
query ($space: String!) {
  proposals(first: 10, where: { space: $space, state: "active" }) {
    id
    title
    choices
    scores
    votes
    end
  }
}
```

### `snapshot-hub-schema`

Returns the Snapshot hub GraphQL schema: query fields and entity types. Call this before `snapshot-hub-query` only when a query fails on an unknown field. Filter input types are omitted (filters are field names with suffixes like `_in`, `_contains`, `_gt`). Still a large response, so do not call it preemptively.

No inputs.

### `snapshot-api-query`

Runs any GraphQL query against the [Snapshot API](https://api.snapshot.box) (`api.snapshot.box`), which indexes onchain spaces — both Snapshot X and Governor (`Space.protocol` is `snapshot-x` or `governor-bravo`). Every query takes an `indexer` argument selecting the network — `eth`, `oeth`, `base`, `arb1`, `mnt`, `ape` (EVM) or `sn` (Starknet). Space ids are contract addresses, proposal ids are `<space address>/<proposal_id>`, and space names / proposal titles and bodies live under `metadata`. Filter `where` by any scalar field, exact or with a suffix `_gt`, `_lt`, `_gte`, `_lte`, `_in`, `_contains` (filter a relation by its id scalar, e.g. `space`). Order with `orderBy: created` — an unquoted enum field name (the hub, by contrast, takes a quoted `orderBy: "created"`). The user's address is auto-bound as `$user`, same as `snapshot-hub-query`.

| Input | Type | Description |
|-------|------|-------------|
| `query` | `string` | GraphQL query string |
| `variables` | `object?` | GraphQL variables |

**Example — fetch the latest proposals for an onchain space:**
```graphql
query ($space: String!) {
  proposals(
    indexer: "eth"
    first: 10
    orderBy: created
    orderDirection: desc
    where: { space: $space }
  ) {
    id
    metadata { title }
    scores_total_parsed
    vote_count
    max_end
  }
}
```

### `snapshot-api-schema`

Returns the GraphQL schema of the Snapshot API: query fields and entity types. Call this before `snapshot-api-query` only when a query fails on an unknown field. Filter and `orderBy` input types are omitted (their grammar is described on `snapshot-api-query`), which keeps the response small. Still large-ish, so do not call it preemptively.

No inputs.

### `snapshot-whoami`

Returns the connected identity and signing capability:

- `address` — the user's account, auto-injected as `$user` in `snapshot-hub-query`.
- `alias` — the delegated signer wallet that signs writes on the user's behalf.
- `authorized` — whether that alias is currently authorized for the user. When `false`, the write tools fail until the user re-authorizes.
- `profile` — the user's public profile (`name`, `about`, `avatar`) when one exists.
- `links.alias` — the page where the user authorizes or revokes the signer alias.

Useful as a pre-flight before a write action. Requires a connected wallet, same as `snapshot-vote`.

No inputs.

### `snapshot-vote`

Casts a vote on a Snapshot proposal. The proposal's voting `type` and `privacy` are fetched from Snapshot and applied automatically, so the caller does not need to specify them. Re-calling on the same proposal **replaces** the previous vote (this is how the user changes a vote).

| Input | Type | Description |
|-------|------|-------------|
| `space` | `string` | Space ID slug (e.g. `"ens.eth"`) |
| `proposal` | `string` | Proposal ID (hex string) |
| `choice` | `number \| number[] \| object` | A number for `basic`/`single-choice`, an array of indices for `approval`/`ranked-choice`, or `{ "1": weight, "2": weight, ... }` for `weighted`/`quadratic` |
| `reason` | `string?` | Reason for the vote. Ignored on Shutter-encrypted proposals. |

Requires a wallet to be configured for signing (see [Configuration](#configuration)). On HTTP, this is the OAuth-managed CDP alias; on stdio, it is the `ALIAS_PRIVATE_KEY`. If the user has not yet authorized the alias, the tool returns the authorization URL for them to visit.

### `snapshot-propose`

Creates a Snapshot proposal. Most defaults come from the space itself, so for typical use you only need `space`, `title`, and `body`. The space's enforced voting type, voting period, and privacy mode are read from Snapshot and applied automatically.

| Input | Type | Description |
|-------|------|-------------|
| `space` | `string` | Space ID slug (e.g. `"ens.eth"`) |
| `title` | `string` | Proposal title |
| `body` | `string?` | Proposal body (markdown) |
| `discussion` | `string?` | Discussion link |
| `type` | `string?` | One of `basic`, `single-choice`, `approval`, `ranked-choice`, `weighted`, `quadratic`. Defaults to whatever the space enforces, or `basic`. |
| `choices` | `string[]?` | Vote choices. Defaults to `["For", "Against", "Abstain"]` for `basic`; required for any other type. |
| `labels` | `string[]?` | Proposal label IDs |
| `start` | `number?` | Voting start as a unix timestamp in seconds. Defaults to `now + space.voting.delay`. |
| `end` | `number?` | Voting end as a unix timestamp in seconds. Defaults to `start + space.voting.period` (3 days if the space sets none). |
| `privacy` | `"shutter" \| "none"?` | Opt into Shutter-encrypted voting with `"shutter"`. Only honored when the space's `voting.privacy` is `"any"`; spaces with `voting.privacy === "shutter"` always encrypt. |

The snapshot block is read from `https://rpc.brovider.xyz/<chainId>` based on the space's network. Requires a wallet, same as `snapshot-vote`.

### `snapshot-follow`

Follows or unfollows a space for the user. Following a space you already follow returns an error, and so does unfollowing a space you do not follow. Check the current state with `follows(where: { follower: $user })` before calling this.

| Input | Type | Description |
|-------|------|-------------|
| `space` | `string` | Space ID slug (e.g. `"ens.eth"`) |
| `action` | `"follow" \| "unfollow"?` | Whether to follow or unfollow. Defaults to `"follow"`. |

Requires a wallet, same as `snapshot-vote` and `snapshot-propose`.

## Usage

### Hosted (Claude Desktop / Claude.ai)

```json
{
  "mcpServers": {
    "snapshot": {
      "type": "http",
      "url": "https://mcp.snapshot.box"
    }
  }
}
```

### Self-hosting

**Requirements:** [Bun](https://bun.sh) ≥ 1.0.0

```bash
bun install
```

#### HTTP server

```bash
bun start
```

Listens on port `8080` by default (override with `PORT` env var).

#### Stdio (local)

```bash
bun run stdio
```

Claude Desktop config example:

```json
{
  "mcpServers": {
    "snapshot": {
      "command": "bun",
      "args": ["src/index.ts", "--stdio"],
      "cwd": "/path/to/snapshot-mcp",
      "env": {
        "ALIAS_PRIVATE_KEY": "0x..."
      }
    }
  }
}
```

## Configuration

Copy `.env.example` to `.env` and configure:

| Variable | Description |
|----------|-------------|
| `SNAPSHOT_API_KEY` | [Snapshot API key](https://docs.snapshot.box/tools/api/api-keys) for higher rate limits (optional) |
| `SNAPSHOT_HUB_URL` | Hub GraphQL endpoint (default `https://hub.snapshot.org/graphql`) |
| `SNAPSHOT_API_URL` | Snapshot API endpoint for onchain spaces (default `https://api.snapshot.box`) |
| `PORT` | HTTP server port (default: `8080`) |
| `BASE_URL` | Public URL for OAuth metadata (e.g. `https://mcp.snapshot.box`) |
| `JWT_SECRET` | HS256 secret used to sign access tokens — **required for HTTP mode** (≥32 chars; `openssl rand -hex 32`) |
| `CDP_API_KEY_ID` | Coinbase CDP API key ID — **required for HTTP mode** |
| `CDP_API_KEY_SECRET` | Coinbase CDP API key secret — **required for HTTP mode** |
| `CDP_WALLET_SECRET` | Coinbase CDP wallet secret — **required for HTTP mode** |
| `ALIAS_PRIVATE_KEY` | Single private key — **stdio mode only** (ignored by HTTP server) |

The HTTP server requires CDP credentials and a JWT secret. Each user who connects via OAuth gets their own CDP-managed alias wallet, so votes can only be signed by the user who authorized the specific alias. Access tokens are stateless JWTs (HS256) signed with `JWT_SECRET`; rotating that secret invalidates every issued token.

## Auth flow

### HTTP (Claude Desktop / Claude.ai) — OAuth 2.0

The HTTP server exposes OAuth 2.0 endpoints. Claude Desktop and Claude.ai will show a **"Connect" button** that triggers the flow automatically:

1. Claude redirects to `/authorize`
2. Server mints a fresh per-session CDP alias wallet and redirects to `snapshot.box/#/settings/alias/authorize/<alias>` with a callback URL
3. User authorizes that alias on Snapshot
4. Snapshot redirects back to `/auth/callback`
5. Server resolves the authorizing user from the alias, generates an auth code, and redirects back to Claude
6. Claude exchanges the code for a JWT (HS256) access token at `/token`
7. All subsequent requests include the token — the server verifies the signature and reads the user and their CDP account from the claims

Each user gets their own CDP alias, so one user cannot sign votes on behalf of another. Tokens are self-verifiable and survive server restarts (until `JWT_SECRET` rotates).

### Stdio (local)

1. Call `snapshot-vote` — if not yet authorized, returns the authorization URL
2. User visits `snapshot.box/#/settings/alias/authorize/<alias>` to authorize
3. Call `snapshot-vote` again — works

## Development

```bash
bun dev      # watch mode
bun test     # run security tests
bun lint     # ESLint
bun format   # Prettier
```
