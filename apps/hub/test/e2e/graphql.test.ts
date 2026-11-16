import db from '../../src/helpers/mysql';

const HOST = `http://localhost:${process.env.PORT || 3030}`;
const ADDRESS = '0x1111111111111111111111111111111111111111';
const SX_SPACE = '0x2222222222222222222222222222222222222222';

// One row per case: a live hub space, a deleted one, one missing from the
// hub, and a Snapshot X space, which never has a row in the hub spaces table.
const ROWS = [
  { space: 'live.eth', network: 's' },
  { space: 'deleted.eth', network: 's' },
  { space: 'missing.eth', network: 's' },
  { space: SX_SPACE, network: 'base' }
];
const VISIBLE_SPACES = [SX_SPACE, 'live.eth'];

async function query<T>(graphql: string): Promise<T> {
  const res = await fetch(`${HOST}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: graphql })
  });
  const { data } = (await res.json()) as { data: T };

  return data;
}

describe('POST /graphql', () => {
  beforeAll(async () => {
    const now = Math.floor(Date.now() / 1e3);
    await db.queryAsync('INSERT INTO spaces SET ?', {
      id: 'live.eth',
      name: 'live.eth',
      created: now,
      updated: now
    });
    await db.queryAsync('INSERT INTO spaces SET ?', {
      id: 'deleted.eth',
      name: 'deleted.eth',
      deleted: 1,
      created: now,
      updated: now
    });

    for (const row of ROWS) {
      await db.queryAsync('INSERT INTO follows SET ?', {
        ...row,
        id: `follow-${row.space}`,
        ipfs: '',
        follower: ADDRESS,
        created: now
      });
      await db.queryAsync('INSERT INTO statements SET ?', {
        ...row,
        id: `statement-${row.space}`,
        delegate: ADDRESS,
        created: now,
        updated: now
      });
    }
  });

  afterAll(async () => {
    await db.queryAsync('DELETE FROM follows WHERE follower = ?', ADDRESS);
    await db.queryAsync('DELETE FROM statements WHERE delegate = ?', ADDRESS);
    await db.queryAsync('DELETE FROM spaces WHERE id IN (?)', [
      ['live.eth', 'deleted.eth']
    ]);
    await db.endAsync();
  });

  it('returns follows of live hub spaces and of other networks', async () => {
    const { follows } = await query<{ follows: { space: { id: string } }[] }>(
      `{ follows(where: { follower: "${ADDRESS}" }) { space { id } } }`
    );

    expect(follows.map(follow => follow.space.id).sort()).toEqual(
      VISIBLE_SPACES
    );
  });

  it('returns statements of live hub spaces and of other networks', async () => {
    const { statements } = await query<{ statements: { space: string }[] }>(
      `{ statements(where: { delegate: "${ADDRESS}" }) { space } }`
    );

    expect(statements.map(statement => statement.space).sort()).toEqual(
      VISIBLE_SPACES
    );
  });

  it.each(ROWS.map(row => row.space))(
    'returns the statement on %s only if its space is visible',
    async space => {
      const id = `statement-${space}`;
      const { statement } = await query<{ statement: { id: string } | null }>(
        `{ statement(id: "${id}") { id } }`
      );

      expect(statement).toEqual(VISIBLE_SPACES.includes(space) ? { id } : null);
    }
  );
});
