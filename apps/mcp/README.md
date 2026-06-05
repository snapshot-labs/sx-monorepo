![loc](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fghloc.ifels.dev%2Fsnapshot-labs%2Fsx-monorepo%2Fmaster%3Fmatch%3Dapps%2Fmcp%2Fsrc%26filter%3D.json%2C.scss%2C.svg%2C.snap%2C.gql%2C.md%2C.yml%2C.png%2C.mp4%2C.css%2C.html%2C.woff2%2C.gif%2C.jpg%2C.toml%2C.txt%2C.mdx%2C.sql%2C.icns%2C.ico&query=%24.loc&label=loc&color=blue)

# Snapshot MCP

A [Model Context Protocol](https://modelcontextprotocol.io) server for [Snapshot](https://snapshot.box). Lets AI assistants read governance data (spaces, proposals, votes, voting power) and act on the user's behalf (cast votes, create proposals, follow spaces) through Snapshot's GraphQL API. Available as a hosted endpoint at `https://mcp.snapshot.box`, or self-hostable.

## Tools

### `snapshot-query`

Runs any GraphQL query against the Snapshot API. The user's address is auto-bound as `$user` — declare it in the query and reference it; do not pass it in `variables`.

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

### `snapshot-schema`

Returns the Snapshot GraphQL schema. Call this before `snapshot-query` only when a query fails on an unknown field or filter. The response is large, so do not call it preemptively.

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

Creates a Snapshot proposal. Most defaults come from the space itself, so for typical use you only need `space`, `title`, and `body`. The space's enforced voting type, voting period, snapshot block, and privacy mode are read from Snapshot and applied automatically.

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
| `shielded` | `boolean?` | Opt into Shutter-encrypted voting. Only honored when the space's `voting.privacy` is `"any"`; spaces with `voting.privacy === "shutter"` always encrypt. |

The snapshot block is read from `https://rpc.snapshot.org/<chainId>` based on the space's network. Requires a wallet, same as `snapshot-vote`.

### `snapshot-follow`

Follows or unfollows a space for the user. Both directions are idempotent — following an already-followed space, or unfollowing one the user does not follow, is a harmless no-op.

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
| `SNAPSHOT_API_URL` | GraphQL endpoint (default `https://hub.snapshot.org/graphql`) |
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
