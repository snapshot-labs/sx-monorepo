# Snapshot UI

![lines](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fghloc.ifels.dev%2Fsnapshot-labs%2Fsx-monorepo%2Fmaster%3Fmatch%3Dapps%2Fui%2Fsrc%26filter%3D.json%2C.scss%2C.svg%2C.snap%2C.gql%2C.md%2C.yml%2C.png%2C.mp4%2C.css%2C.html%2C.woff2%2C.gif%2C.jpg%2C.toml%2C.txt%2C.mdx%2C.sql%2C.icns%2C.ico&query=%24.loc&label=lines&color=blue)

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
