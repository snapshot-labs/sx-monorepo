![loc](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fghloc.ifels.dev%2Fsnapshot-labs%2Fsx-monorepo%2Fmaster%3Fmatch%3Dapps%2Fhub%2Fsrc%26filter%3D.json%2C.scss%2C.svg%2C.snap%2C.gql%2C.md%2C.yml%2C.png%2C.mp4%2C.css%2C.html%2C.woff2%2C.gif%2C.jpg%2C.toml%2C.txt%2C.mdx%2C.sql%2C.icns%2C.ico&query=%24.loc&label=loc&color=blue)

# Snapshot hub

GraphQL API for the Snapshot offchain protocol.

## Install

1. Install [Bun](https://bun.sh), clone the repository, then say:

```sh
bun install
```

2. Copy [`.env.example`](https://github.com/snapshot-labs/snapshot-hub/blob/master/.env.example), rename it to `.env` and set a value for these config vars:

- `HUB_DATABASE_URL`: The database connection string. You will need to run your own MySQL database or use a Cloud service like [JawsDB](https://jawsdb.com).
- `SEQ_DATABASE_URL`:  We now use `messages` from a different database, it can be same as `HUB_DATABASE_URL` in your local
- `RELAYER_PK`: This is the private key of the hub. The hub counter-sign every accepted message with this key.

3. Create the database schema

Run this query on the MySQL database to create the initial schema with the required tables: 
https://github.com/snapshot-labs/snapshot-hub/blob/master/src/helpers/schema.sql

### Run

- Use this command to run the hub:

```sh
bun start
```

- Go on this page: http://localhost:3000/api if everything is fine it should return details of the hub example:

```json
{
  "name": "snapshot-hub",
  "network": "mainnet",
  "version": "0.1.3",
  "tag": "alpha",
  "relayer": "0x8BBE4Ac64246d600BC2889ef5d83809D138F03DF"
}
```

### Load a space setting

To load a space settings in the database you can go on this endpoint <http://localhost:3000/api/spaces/yam.eth/poke> (change yam.eth with the space you want to activate).

## Flag codes

The hub uses flag codes (`flagCode`) to mark proposals and spaces for various reasons:

| Flag Code | Description             | Purpose                                                           |
|-----------|-------------------------|-------------------------------------------------------------------|
| `1`       | Spam/Malicious Content  | Reserved for content identified as spam or malicious             |
| `2`       | DMCA Requests          | Reserved for Digital Millennium Copyright Act takedown requests  |
| `3+`      | Future Use             | Additional codes may be introduced for other moderation purposes  |

When content is flagged, it may have restricted visibility or functionality depending on the flag type applied.

## License

Snapshot is open-sourced software licensed under the © [MIT license](LICENSE).
