import { getProposal, getSpace } from '../helpers/actions';
import db from '../helpers/mysql';
import { jsonParse } from '../helpers/utils';

export function isAuthorized({ space, address }): boolean {
  const admins = (space?.admins || []).map(admin => admin.toLowerCase());
  const mods = (space?.moderators || []).map(mod => mod.toLowerCase());

  return (
    admins.includes(address.toLowerCase()) ||
    mods.includes(address.toLowerCase())
  );
}

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);

  const proposal = await getProposal(msg.space, msg.payload.proposal);
  if (!proposal) return Promise.reject('unknown proposal');
  if (proposal.flagged) return Promise.reject('proposal already flagged');
  const space = await getSpace(msg.space);

  const isAuthorizedToFlag = isAuthorized({
    space,
    address: body.address
  });
  if (!isAuthorizedToFlag)
    return Promise.reject('not authorized to flag proposal');

  return Promise.resolve(proposal);
}

export async function action(body): Promise<void> {
  const msg = jsonParse(body.msg);

  const query = 'UPDATE proposals SET flagged = 1 WHERE id = ? LIMIT 1';
  const params: any[] = [msg.payload.proposal];

  await db.queryAsync(query, params);
}
