![loc](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fghloc.ifels.dev%2Fsnapshot-labs%2Fsx-monorepo%2Fmaster%3Fmatch%3Dapps%2Fapi%2Fsrc%26filter%3D.json%2C.scss%2C.svg%2C.snap%2C.gql%2C.md%2C.yml%2C.png%2C.mp4%2C.css%2C.html%2C.woff2%2C.gif%2C.jpg%2C.toml%2C.txt%2C.mdx%2C.sql%2C.icns%2C.ico&query=%24.loc&label=loc&color=blue)

# API

This API uses Checkpoint SDK to index Snapshot X and Governor spaces information on multiple EVM chains and Starknet.

For more about how checkpoint works, refer to its documentation here: https://docs.checkpoint.snapshot.box

## Getting Started (Local Development)

This API depends on a couple of services:

- Node.js (>= v16.0.0)
- MySQL (v8.0)
- Starknet Provider (optional).

To get start, first install all dependencies with:

```sh
bun install

```

Next, you need to have a MySQL server running and accessible. You can use the docker-compose service to start one up quickly with:

```sh
docker compose up mysql # this will start mysql on port 3306
```

Next, make a copy of `.env.example` and rename it as `.env`. Then update the credentials in the file to the correct values for your
local setup.

> Note: If using docker compose to start dependencies then the default .env.example value should be okay as it is.

Finally, to run the service you do:

```sh
bun run dev
```

This should start the service to be listening on port 3000.

### Running Tests

Before running tests, ensure you have MySQL server running (see getting started guide for some pointer to do this).

Next, run:

```
bun run test
```

This will run all tests.

### Using local Checkpoint

Because `graphql` package needs single copy of itself to work properly using Apollo and Checkpoint
at the same time (which depend on `graphql`) can cause issues when using linked local copy of Checkpoint
as it brings two copies (one from `sx-api` one from linked `checkpoint`).

To workaround this you need to do this

```sh
cd checkpoint/node_modules/graphql
bun link

cd sx-api
bun link graphql
```
