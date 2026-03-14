# Snapshot UI

An open source interface for Snapshot and Snapshot X protocols.

**[Website](https://snapshot.box)**

## Development guide

This project uses `starknet` and `starknet-testnet` Starknet networks. Make sure that your Metamask/ArgentX is
configured for those networks.

If you need to modify services that are used by sx-ui you can specify them in `.env` file or applicable
file in `./src/networks`.

## Electron App

### Development

```bash
bun run electron:start
```

This will start the Electron app in development mode. uses dev server at http://localhost:8080

### Build

```bash
bun run electron:build
```

This will create installers for all platforms (macOS, Windows, Linux).

## License

Snapshot is open-sourced software licensed under the © [MIT license](LICENSE).
