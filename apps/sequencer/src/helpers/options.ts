import db from './mysql';

async function getOptions<T>(
  keys: string[],
  defaultValue: T,
  formattingFn: (val: string) => T
): Promise<Record<string, T>> {
  const results = keys.reduce((acc, key) => {
    acc[key] = defaultValue;
    return acc;
  }, {});

  const options = await db.queryAsync(
    'select name, value from options where name in (?)',
    [keys]
  );

  options.forEach(result => {
    results[result.name] = formattingFn(result.value);
  });

  return results;
}

export async function getLimit(key: string): Promise<number> {
  return (await getLimits([key]))[key];
}

export async function getList(key: string): Promise<string[]> {
  return (await getLists([key]))[key];
}

export async function getLimits(
  keys: string[]
): Promise<Record<string, number>> {
  return await getOptions<number>(keys, 0, val => Number(val));
}

export async function getLists(
  keys: string[]
): Promise<Record<string, string[]>> {
  return await getOptions<string[]>(keys, [], val => val.split(','));
}

export async function getSpaceType(
  space: {
    verified: boolean;
    turbo: boolean;
    flagged: boolean;
    id: string;
  },
  withEcosystem = false
) {
  let type = 'default';

  if (
    withEcosystem &&
    (await getList('space.ecosystem.list')).includes(space.id)
  ) {
    type = 'ecosystem';
  }
  if (space.flagged) type = 'flagged';
  if (space.verified) type = 'verified';
  if (space.turbo) type = 'turbo';

  return type;
}
