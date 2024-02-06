# Snapshot X UI

An open source interface for Snapshot X protocol.

**[Website](https://snapshotx.xyz)**

## Development guide

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
- Visit `https://mana.pizza/fossil/send/BLOCK_NUM_1` where BLOCK_NUM_1 is block you want to send to L2
- Visit `https://mana.pizza/fossil/process/BLOCK_NUM_2` where BLOCK_NUM_2 is the block you used above **minus 1**

If you need to modify services that are used by sx-ui you can specify them in `.env` file or applicable
file in `./src/networks`.

## License

Snapshot is open-sourced software licensed under the © [MIT license](LICENSE).
