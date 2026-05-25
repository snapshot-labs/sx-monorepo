---
name: snapshot
description: Drive Snapshot governance from the shell via the `snapshot` CLI. Use when the user asks to list, read, search, vote on, propose, follow, or unfollow Snapshot spaces or proposals; resolve an ENS name to an address; or print the connected Snapshot identity. Requires `@snapshot-labs/cli` installed and (for writes) an authorized alias key.
---

# Snapshot — governance CLI

The `snapshot` CLI is the shell-side counterpart of the Snapshot MCP. It reads
the Snapshot hub over GraphQL and signs writes via [sx.js](../../sx.js).

## Install

```sh
bun add -g @snapshot-labs/cli
# or, in the sx-monorepo:
bun packages/cli/src/index.ts <command>
```

To install the skill, drop this file at `~/.claude/skills/snapshot/SKILL.md`
(Claude Code reads any `~/.claude/skills/<name>/SKILL.md` on startup):

```sh
mkdir -p ~/.claude/skills/snapshot
ln -s "$PWD/packages/cli/skill/SKILL.md" ~/.claude/skills/snapshot/SKILL.md
```

## Auth

Reads work anonymously. Writes (`vote`, `propose`, `follow`, `unfollow`,
`whoami`) need an authorized alias:

```sh
export ALIAS_PRIVATE_KEY=0x$(openssl rand -hex 32)
snapshot whoami   # prints the alias address on failure — visit the URL once
```

The alias stays authorized for 90 days. Re-authorize from the same URL when it
expires.

## Commands

```
snapshot whoami                                  # connected address + ENS + profile
snapshot resolve <name-or-address>               # ENS / Lens <-> 0x… (either direction)
snapshot proposals [--space ens.eth] [--state active] [--first 50]
snapshot space <id>                              # show a space's config
snapshot search <query>                          # search spaces by name
snapshot vote <proposal> <choice> [--reason "…"] # 1-based index, JSON array, or JSON object
snapshot propose <space> <title> [--body "…" | --body-file path] [--choices "Yes,No"] [--type basic]
snapshot follow <space>
snapshot unfollow <space>
```

`proposals` output is one row per line: `id  state  space  title  url` — easy to
pipe into `awk '{print $1}'` to grab proposal ids.

## When to use the CLI vs the Snapshot MCP

- Prefer the **MCP** when it's connected: it shares the user's auth, returns
  structured JSON, and works inside Claude Code/Desktop without a shell.
- Reach for the **CLI** for one-offs in a terminal, for scripting (cron, CI,
  shell pipelines), or when the user explicitly asks for a shell command.

Both speak the same hub, so a `snapshot proposals` from the CLI and an
equivalent `snapshot-query` over MCP return the same data.

## Quick recipes

Find a space:

```sh
snapshot search "uniswap" | head -5
```

List active proposals in a space:

```sh
snapshot proposals --space arbitrumfoundation.eth --state active
```

Vote "For" (choice 1) with a reason:

```sh
snapshot vote 0xabc… 1 --reason "Aligned with the SPP roadmap"
```

Re-running `snapshot vote` on the same proposal replaces the previous vote.

Propose with a body file:

```sh
snapshot propose ens.eth "Title here" --body-file proposal.md
```

## Environment

- `ALIAS_PRIVATE_KEY` — alias signing key (hex). Required for writes.
- `SNAPSHOT_API_URL` — override the hub URL (default `https://hub.snapshot.org/graphql`).
- `SNAPSHOT_API_KEY` — sent as `x-api-key` if rate-limited.
