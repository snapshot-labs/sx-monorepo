# @snapshot-labs/cli

Snapshot governance CLI. Reads via the Snapshot hub, writes via [sx.js](../sx.js).

## Install

```sh
bun add -g @snapshot-labs/cli
```

Or run from the monorepo:

```sh
bun packages/cli/src/index.ts <command>
```

## Auth

Write commands (`vote`, `propose`, `follow`, `unfollow`, `whoami`) need an
authorized alias. Generate a key, then authorize it once via the UI:

```sh
export ALIAS_PRIVATE_KEY=0x$(openssl rand -hex 32)
# visit https://snapshot.box/#/settings/alias/authorize/<your-alias-address>
```

The alias address is derived from the key; `snapshot whoami` prints it. The
alias stays valid for 90 days.

## Commands

```
snapshot whoami
snapshot resolve fabien.eth
snapshot proposals [--space ens.eth] [--state active] [--first 50]
snapshot space ens.eth
snapshot search "uniswap"
snapshot vote <proposal> <choice> [--reason "..."]
snapshot propose <space> <title> [--body … | --body-file path] [--choices "Yes,No"] [--type basic]
snapshot follow <space>
snapshot unfollow <space>
```

Choices: a 1-based index for single-choice/basic, a JSON array for
approval/ranked-choice (`'[1,3]'`), or a JSON object for
weighted/quadratic (`'{"1":1,"2":2}'`).

## Environment

- `ALIAS_PRIVATE_KEY` — alias signing key (hex). Required for writes.
- `SNAPSHOT_API_URL` — override the hub URL.
- `SNAPSHOT_API_KEY` — sent as `x-api-key`.

## Claude Code skill

A Claude Code [skill](https://docs.claude.com/claude-code/skills) that teaches
Claude when and how to invoke this CLI lives at [`skill/SKILL.md`](./skill/SKILL.md).
Symlink it into `~/.claude/skills/snapshot/SKILL.md` to enable it.
