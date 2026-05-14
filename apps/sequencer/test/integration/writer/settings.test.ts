import db, { sequencerDB } from '../../../src/helpers/mysql';
import { action, verify } from '../../../src/writer/settings';
import payload from '../../fixtures/writer-payload/space.json';

const defaultSpace = JSON.parse(payload.msg).space;
const spaceId = 'test-domain-uniqueness.eth';
const testDomainId = 'test-domain-uniqueness-2.eth';

function getInput(id = defaultSpace, msgPayload = {}) {
  const input = { ...payload };
  const inputMsg = JSON.parse(input.msg);
  inputMsg.payload = { ...inputMsg.payload, ...msgPayload };
  inputMsg.space = id;

  input.msg = JSON.stringify(inputMsg);

  return input;
}

afterEach(() => {
  jest.restoreAllMocks();
});

const mockGetSpaceController = jest.fn((): any => {
  return '';
});
jest.mock('@snapshot-labs/snapshot.js', () => {
  const originalModule = jest.requireActual('@snapshot-labs/snapshot.js');

  return {
    ...originalModule,
    utils: {
      ...originalModule.utils,
      getSpaceController: () => mockGetSpaceController()
    }
  };
});

describe.skip('writer/settings', () => {
  afterAll(async () => {
    await db.queryAsync(
      'DELETE FROM snapshot_sequencer_test.spaces WHERE id IN (?)',
      [spaceId, testDomainId]
    );
    await db.endAsync();
    await sequencerDB.endAsync();
  });

  describe('verify()', () => {
    const DOMAIN = 'vote.snapshot.org';

    beforeAll(async () => {
      await db.queryAsync(
        'INSERT INTO snapshot_sequencer_test.spaces (id, name, created, updated, domain) VALUES (?, ?, 0, 0, ?)',
        [testDomainId, testDomainId, DOMAIN]
      );
    });

    afterAll(async () => {
      await db.queryAsync(
        'DELETE FROM snapshot_sequencer_test.spaces WHERE id = ?',
        [testDomainId]
      );
    });

    it('rejects when domain is used by another space', async () => {
      const input = getInput(spaceId, { domain: DOMAIN });

      mockGetSpaceController.mockResolvedValueOnce(input.address);
      await expect(verify(input)).rejects.toContain('domain already taken');
      expect(mockGetSpaceController).toHaveBeenCalledTimes(1);
    });

    it('resolves when domain is not used yet', async () => {
      const input = getInput(spaceId, { domain: 'vote1.snapshot.org' });

      mockGetSpaceController.mockResolvedValueOnce(input.address);
      await expect(verify(input)).resolves.toBeUndefined();
      expect(mockGetSpaceController).toHaveBeenCalledTimes(1);
    });
  });

  describe('action()', () => {
    afterEach(async () => {
      await db.queryAsync(
        'DELETE FROM snapshot_sequencer_test.spaces WHERE id IN (?)',
        [spaceId, testDomainId]
      );
    });

    describe('with a domain', () => {
      it('saves the domain in space settings and in the domain column', async () => {
        const domain = 'test-domain.eth';
        const input = getInput(spaceId, { domain });
        const save = await action(input);

        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        expect(save).resolves;

        const results = (
          await db.queryAsync(
            "SELECT id, JSON_UNQUOTE(settings->'$.domain') as settingsDomain, domain as columnDomain FROM spaces WHERE id = ?",
            [spaceId]
          )
        )[0];

        expect(results.id).toBe(spaceId);
        expect(results.settingsDomain).toBe(domain);
        expect(results.columnDomain).toBe(domain);
      });
    });

    describe('without domain', () => {
      it('sets the domain in space setting and column as NULL', async () => {
        const input = getInput(spaceId);
        const save = await action(input);

        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        expect(save).resolves;

        const results = (
          await db.queryAsync(
            "SELECT id, JSON_UNQUOTE(settings->'$.domain') as settingsDomain, domain as columnDomain FROM spaces WHERE id = ?",
            [spaceId]
          )
        )[0];

        expect(results.id).toBe(spaceId);
        expect(results.settingsDomain).toBe(null);
        expect(results.columnDomain).toBe(null);
      });
    });
  });
});
