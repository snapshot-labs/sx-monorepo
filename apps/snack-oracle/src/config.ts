import 'dotenv/config';

// Anvil default account #1 private key
const DEFAULT_ORACLE_KEY =
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

export const config = {
  port: Number(process.env.PORT ?? 3003),
  rpcUrl: process.env.RPC_URL ?? 'http://127.0.0.1:8545',
  oraclePrivateKey: (process.env.ORACLE_PRIVATE_KEY ??
    DEFAULT_ORACLE_KEY) as `0x${string}`,
  factoryAddress: process.env.FACTORY_ADDRESS as `0x${string}`,
  snapshotApiUrl:
    process.env.SNAPSHOT_API_URL ?? 'https://hub.snapshot.org/graphql',
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 30_000)
};
