[![Test CI](https://github.com/snapshot-labs/sx-ui/actions/workflows/test.yml/badge.svg)](https://github.com/snapshot-labs/sx-ui/actions/workflows/test.yml)
![GitHub commit activity](https://img.shields.io/github/commit-activity/w/snapshot-labs/sx-ui)
[![GitHub issues help wanted](https://img.shields.io/github/issues/snapshot-labs/sx-ui/help%20wanted)](https://github.com/snapshot-labs/sx-ui/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22)
[![Discord](https://img.shields.io/discord/707079246388133940.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://discord.snapshot.org/)
[![Twitter](https://img.shields.io/twitter/follow/SnapshotLabs?label=SnapshotLabs&style=flat&logo=twitter&color=1DA1F2)](https://twitter.com/SnapshotLabs)

# Snapshot X

Snapshot X is an on-chain governance platform.

**[testnet.snapshotx.xyz](https://testnet.snapshotx.xyz)**

**[Documentation](https://obytejs.com)**

## Project setup

```
yarn
```

### Compiles and hot-reloads for development

```
yarn dev
```

### Compiles and minifies for production

```
yarn build
```

### Lints and fixes files

```
yarn lint
```

### Runs tests

```
yarn test:unit
```

### Verifies TypeScript code

```
yarn typecheck
```

## Development Guide

This project uses `goerli` and `testnet-2` Starknet networks. Make sure that your Metamask/ArgentX is
configured for those networks.

If you need testnet funds you can use:

- [PoW faucet](https://goerli-faucet.pk910.de) to acquire ETH on goerli.
- [`0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6`](https://goerli.etherscan.io/address/0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6#writeContract) to wrap ETH to WETH.
- [`0xAEA4513378Eb6023CF9cE730a26255D0e3F075b9`](https://goerli.etherscan.io/address/0xAEA4513378Eb6023CF9cE730a26255D0e3F075b9#writeProxyContract) to move ETH to Starknet testnet-2.

If you want to test proposals that verify your WETH balance on Starknet proposals proofs have to be computed on L2.
This is done manually currently.

To do it:

- Take some block on goerli at which you have your desired amount of WETH
- Visit `https://testnet.mana.pizza/fossil/send/BLOCK_NUM_1` where BLOCK_NUM_1 is block you want to send to L2
- Visit `https://testnet.mana.pizza/fossil/process/BLOCK_NUM_2` where BLOCK_NUM_2 is the block you used above **minus 1**

If you need to modify services that are used by sx-ui you can specify them in `.env` file or applicable
file in `./src/networks`.

## License

Snapshot is open-sourced software licensed under the © [MIT license](LICENSE).
