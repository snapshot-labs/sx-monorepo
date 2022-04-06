# SX-API

This API uses checkpoint to index Snapshot X spaces information on Starknet.

For more about how checkpoint works, refer to its documentation.

## Getting Started (Local Development)

This API depends on a couple of services:

- Node.js (>= v16.0.0)
- MySQL (v 5.7)
- Starknet Provider (optional).

To get start, first install all dependencies with:

```sh
yarn

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
yarn dev
```

This should start the service to be listening on port 3000.

### Running Tests

Before running tests, ensure you have MySQL server running (see getting started guide for some pointer to do this).

Next, run:

```
yarn test
```

This will run all tests.
