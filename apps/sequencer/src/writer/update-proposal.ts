import snapshot from '@snapshot-labs/snapshot.js';
import { getProposal, getSpace } from '../helpers/actions';
import log from '../helpers/log';
import { containsFlaggedLinks } from '../helpers/moderation';
import db from '../helpers/mysql';
import { jsonParse, validateChoices } from '../helpers/utils';

// We don't need most of the checks used https://github.com/snapshot-labs/snapshot-sequencer/blob/89992b49c96fedbbbe33b42041c9cbe5a82449dd/src/writer/proposal.ts#L62
// because we assume that those checks were already done during the proposal creation
export function getSpaceUpdateError({ type, space }): string | undefined {
  const { voting = {} } = space;

  if (voting.type && type !== voting.type) return 'space voting type mismatch';

  return undefined;
}

export async function verify(body): Promise<any> {
  const msg = jsonParse(body.msg);

  const space = await getSpace(msg.space);
  space.id = msg.space;

  const schemaIsValid: any = snapshot.utils.validateSchema(
    snapshot.schemas.updateProposal,
    msg.payload,
    {
      spaceType: space.turbo ? 'turbo' : 'default'
    }
  );
  if (schemaIsValid !== true) {
    log.warn('[writer] Wrong proposal format', schemaIsValid);
    return Promise.reject('wrong proposal format');
  }

  const proposal = await getProposal(msg.space, msg.payload.proposal);
  if (!proposal) return Promise.reject('unknown proposal');

  const timestampNow = Math.floor(Date.now() / 1e3);
  if (proposal.start < timestampNow)
    return Promise.reject('proposal already started');

  const isChoicesValid = validateChoices({
    type: msg.payload.type,
    choices: msg.payload.choices
  });
  if (!isChoicesValid) {
    return Promise.reject(
      `wrong choices for "${msg.payload.type}" type voting`
    );
  }

  if (proposal.author.toLowerCase() !== body.address.toLowerCase())
    return Promise.reject('Not the author');

  const spacePrivacy = space.voting?.privacy ?? 'any';
  const proposalPrivacy = msg.payload.privacy;

  if (
    proposalPrivacy !== undefined &&
    spacePrivacy !== 'any' &&
    spacePrivacy !== proposalPrivacy
  ) {
    return Promise.reject('not allowed to set privacy');
  }

  const spaceUpdateError = getSpaceUpdateError({
    type: msg.payload.type,
    space
  });
  if (spaceUpdateError) return Promise.reject(spaceUpdateError);

  return Promise.resolve(proposal);
}

export async function action(body, ipfs): Promise<void> {
  const msg = jsonParse(body.msg);
  const updated = parseInt(msg.timestamp);
  const metadata = msg.payload.metadata || {};
  const plugins = JSON.stringify(metadata.plugins || {});
  const spaceSettings = await getSpace(msg.space);
  let privacy = spaceSettings.voting?.privacy ?? 'any';
  if (privacy === 'any') {
    privacy = msg.payload.privacy ?? '';
  }

  const proposal = {
    ipfs,
    updated,
    type: msg.payload.type,
    plugins,
    title: msg.payload.name,
    body: msg.payload.body,
    discussion: msg.payload.discussion,
    choices: JSON.stringify(msg.payload.choices),
    labels: msg.payload.labels?.length
      ? JSON.stringify(msg.payload.labels)
      : null,
    privacy,
    scores: JSON.stringify([]),
    scores_by_strategy: JSON.stringify([]),
    flagged: +containsFlaggedLinks(msg.payload.body)
  };

  const query = 'UPDATE proposals SET ? WHERE id = ? LIMIT 1';
  const params: any[] = [proposal, msg.payload.proposal];

  await db.queryAsync(query, params);
}
