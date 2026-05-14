import snapshot from '@snapshot-labs/snapshot.js';
import log from './log';
import { getStrategies } from './strategies';

const DEFAULT_SNAPSHOT_ENV: string = 'testnet';

export async function validateSpaceSettings(
  originalSpace: any,
  snapshotEnv = process.env.NETWORK ?? DEFAULT_SNAPSHOT_ENV
): Promise<void> {
  const spaceType = originalSpace.turbo ? 'turbo' : 'default';
  const space = snapshot.utils.clone(originalSpace);

  if (space?.deleted) return Promise.reject('space deleted, contact admin');

  delete space.deleted;
  delete space.flagged;
  delete space.verified;
  delete space.turbo;
  delete space.hibernated;
  delete space.id;

  if (space.parent && space.parent === originalSpace.id) {
    return Promise.reject('space cannot be its own parent');
  }

  if (
    space.children &&
    Array.isArray(space.children) &&
    space.children.includes(originalSpace.id)
  ) {
    return Promise.reject('space cannot be its own child');
  }

  const schemaIsValid: any = snapshot.utils.validateSchema(
    snapshot.schemas.space,
    space,
    {
      spaceType,
      snapshotEnv
    }
  );

  if (schemaIsValid !== true) {
    log.warn('[writer] Wrong space format', schemaIsValid);
    const firstErrorObject: any = Object.values(schemaIsValid)[0];
    if (firstErrorObject.message === 'network not allowed') {
      return Promise.reject(firstErrorObject.message);
    }
    return Promise.reject('wrong space format');
  }

  const strategiesIds: string[] = space.strategies.map(
    (strategy: any) => strategy.name
  );
  if (snapshotEnv !== 'testnet') {
    const hasTicket = strategiesIds.includes('ticket');
    const hasVotingValidation =
      space.voteValidation?.name &&
      !['any'].includes(space.voteValidation.name);

    if (hasTicket && !hasVotingValidation) {
      return Promise.reject('space with ticket requires voting validation');
    }

    const hasProposalValidation =
      (space.validation?.name && space.validation.name !== 'any') ||
      space.filters?.minScore ||
      space.filters?.onlyMembers;

    if (!hasProposalValidation) {
      return Promise.reject('space missing proposal validation');
    }
  }

  for (const id of strategiesIds) {
    const strategy = getStrategies()[id];

    if (!strategy) {
      return Promise.reject(`strategy '${id}' is not a valid strategy`);
    }

    if (strategy.disabled) {
      return Promise.reject(`strategy '${id}' is not available anymore`);
    }

    if (strategy.override && spaceType !== 'turbo') {
      return Promise.reject(
        `strategy '${id}' is only available for pro spaces`
      );
    }
  }
}
