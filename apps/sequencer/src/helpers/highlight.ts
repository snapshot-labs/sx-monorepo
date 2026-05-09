import { sequencerDB } from './mysql';

export async function storeMsg(
  id,
  ipfs,
  address,
  version,
  timestamp,
  space,
  type,
  sig,
  receipt
) {
  const query = 'INSERT INTO messages SET ?';
  await sequencerDB.queryAsync(query, [
    {
      id,
      ipfs,
      address,
      version,
      timestamp,
      space,
      type,
      sig,
      receipt
    }
  ]);
}

export async function doesMessageExist(id: string): Promise<boolean> {
  const result = await sequencerDB.queryAsync(
    'SELECT 1 FROM messages WHERE id = ? LIMIT 1',
    id
  );
  return result.length > 0;
}
