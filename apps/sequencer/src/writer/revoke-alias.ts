import db from '../helpers/mysql';
import { jsonParse } from '../helpers/utils';

export async function verify(message): Promise<any> {
  const msg = jsonParse(message.msg, {});
  const alias = msg.payload?.alias;
  if (!alias || typeof alias !== 'string') {
    return Promise.reject('wrong revoke-alias format');
  }

  const [existing] = await db.queryAsync(
    'SELECT 1 FROM aliases WHERE address = ? AND alias = ? LIMIT 1',
    [message.address, alias]
  );
  if (!existing) return Promise.reject('alias does not exist');

  return true;
}

export async function action(message): Promise<void> {
  const msg = jsonParse(message.msg);
  await db.queryAsync('DELETE FROM aliases WHERE address = ? AND alias = ?', [
    message.address,
    msg.payload.alias
  ]);
}
