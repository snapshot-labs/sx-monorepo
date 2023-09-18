import fs from 'fs';
import knex from 'knex';
import { ConnectionString } from 'connection-string';

const connectionConfig = new ConnectionString(process.env.DATABASE_URL);
if (!connectionConfig.protocol || !connectionConfig.hosts || !connectionConfig.path) {
  throw new Error('invalid connection string provided');
}

const sslConfig: { rejectUnauthorized?: boolean; sslmode?: string; ca?: string } = {};
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

export default knex({
  client: 'pg',
  connection: {
    database: connectionConfig.path[0],
    user: connectionConfig.user,
    password: connectionConfig.password,
    host: connectionConfig.hosts[0].name,
    port: connectionConfig.hosts[0].port,
    ssl: Object.keys(sslConfig).length > 0 ? sslConfig : undefined
  }
});
