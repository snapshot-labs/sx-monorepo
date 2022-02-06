import mysql from '../mysql';

export default async function query() {
  return await mysql.queryAsync('SELECT * FROM proposals');
}
