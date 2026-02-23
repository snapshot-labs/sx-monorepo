import 'dotenv/config';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { type Knex } from 'knex';

const config: Knex.Config = {
  client: 'pg',
  connection: process.env.DATABASE_URL
};

export default config;
