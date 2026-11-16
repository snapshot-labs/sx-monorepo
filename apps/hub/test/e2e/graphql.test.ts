import db from '../../src/helpers/mysql';

const HOST = `http://localhost:${process.env.PORT || 3030}`;
const USER = '0x1111111111111111111111111111111111111111';
const SX_SPACE = '0x2222222222222222222222222222222222222222';

describe('POST /graphql', () => {
  beforeAll(async () => {
    await db.queryAsync(`
      INSERT INTO spaces (id, name, deleted, created, updated)
      VALUES ('live.eth', '', 0, 0, 0), ('deleted.eth', '', 1, 0, 0)
    `);
    // missing.eth has no space row, and Snapshot X spaces never have one
    for (const [created, [space, network]] of [
      ['live.eth', 's'],
      ['deleted.eth', 's'],
      ['missing.eth', 's'],
      [SX_SPACE, 'base']
    ].entries()) {
      const row = { id: space, space, network, created };
      await db.queryAsync('INSERT INTO follows SET ?', {
        ...row,
        ipfs: '',
        follower: USER
      });
      await db.queryAsync('INSERT INTO statements SET ?', {
        ...row,
        delegate: USER,
        updated: created
      });
    }
  });

  afterAll(() => db.endAsync());

  it('hides deleted and missing hub spaces but not other networks', async () => {
    const res = await fetch(`${HOST}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          follows(where: { follower: "${USER}" }) { space { id } }
          statements(where: { delegate: "${USER}" }) { space }
          sx: statement(id: "${SX_SPACE}") { id }
          deleted: statement(id: "deleted.eth") { id }
        }`
      })
    });

    expect(await res.json()).toEqual({
      data: {
        follows: [{ space: { id: SX_SPACE } }, { space: { id: 'live.eth' } }],
        statements: [{ space: SX_SPACE }, { space: 'live.eth' }],
        sx: { id: SX_SPACE },
        deleted: null
      }
    });
  });
});
