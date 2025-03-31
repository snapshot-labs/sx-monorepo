import 'dotenv/config';
import fs from 'fs';
import { ConnectionString } from 'connection-string';
// This is a workaround for Node v23.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { type Knex } from 'knex';

const connectionConfig = new ConnectionString(process.env.DATABASE_URL);
if (
  !connectionConfig.protocol ||
  !connectionConfig.hosts ||
  !connectionConfig.path
) {
  throw new Error('invalid connection string provided');
}

const sslConfig: {
  rejectUnauthorized?: boolean;
  sslmode?: string;
  ca?: string;
} = {};
if (
  connectionConfig.params?.sslaccept === 'strict' ||
  connectionConfig.params?.ssl === 'rejectUnauthorized'
) {
  sslConfig.rejectUnauthorized = true;
}
if (connectionConfig.params?.sslmode) {
  sslConfig.sslmode = connectionConfig.params.sslmode;
}

if (process.env.CA_CERT) {
  sslConfig.ca = process.env.CA_CERT.replace(/\\n/g, '\n');
} else if (process.env.CA_CERT_FILE) {
  sslConfig.ca = fs.readFileSync(process.env.CA_CERT_FILE).toString();
}

const config: Knex.Config = {
  client: 'pg',
  connection: {
    database: connectionConfig.path[0],
    user: connectionConfig.user,
    password: connectionConfig.password,
    host: connectionConfig?.hosts[0]?.name,
    port: connectionConfig?.hosts[0]?.port,
    ssl: Object.keys(sslConfig).length > 0 ? sslConfig : undefined
  }
};

export default config;
