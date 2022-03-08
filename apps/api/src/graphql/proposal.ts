import mysql from '../mysql';

export default async function query(parent, { id }) {
  const query = 'SELECT * FROM proposals WHERE id = ? LIMIT 1';
  const [proposal] = await mysql.queryAsync(query, [id]);
  return proposal;
}
