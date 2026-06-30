# Delegates API

This API uses the Checkpoint SDK to index ERC20Votes delegate information across
multiple EVM chains and Starknet.

For more about how Checkpoint works, refer to its documentation here: https://docs.checkpoint.box

## Getting Started (Local Development)

This API depends on:

- Node.js (>= v22.6.0)
- PostgreSQL

Make a copy of `.env.example` and rename it as `.env`, then update `DATABASE_URL`
to point at your local PostgreSQL instance.

Install dependencies and run the service with:

```sh
bun install
bun run dev
```

This starts the service listening on port 3000.
