import db from '../../../src/helpers/mysql';
import poke from '../../../src/helpers/poke';
import { spacesSqlFixtures } from '../../fixtures/space';

const mockGetSpaceUri = jest.fn((): any => {
  return 'https://snapshot.org';
});
const mockGetJSON = jest.fn((): any => {
  return {};
});
jest.mock('@snapshot-labs/snapshot.js', () => {
  const originalModule = jest.requireActual('@snapshot-labs/snapshot.js');

  return {
    ...originalModule,
    utils: {
      ...originalModule.utils,
      getSpaceUri: () => mockGetSpaceUri(),
      getJSON: () => mockGetJSON()
    }
  };
});

describe('poke', () => {
  afterAll(async () => {
    await db.endAsync();
  });

  describe('on invalid input', () => {
    it('returns an error when the domain does not have a snapshot TXT record', () => {
      mockGetSpaceUri.mockResolvedValueOnce(null);

      expect(poke('test.eth')).rejects.toMatch('missing snapshot TXT record');
      expect(mockGetSpaceUri).toHaveBeenCalledTimes(1);
    });

    it('returns an error when the TXT record is not an url', () => {
      mockGetSpaceUri.mockResolvedValueOnce('test.eth');

      expect(poke('test.eth')).rejects.toMatch('not a valid uri');
      expect(mockGetSpaceUri).toHaveBeenCalledTimes(1);
    });

    it('returns an error when the content of the TXT record is a JSON file', () => {
      mockGetJSON.mockRejectedValue(new Error());

      expect(poke('test.eth')).rejects.toMatch('not a valid JSON file');
    });

    it('returns an error when the content of the TXT record is not a valid space schema', () => {
      mockGetJSON.mockResolvedValueOnce({ name: 'test' });

      expect(poke('test.eth')).rejects.toMatch('invalid space format');
    });
  });

  describe('on valid input', () => {
    afterEach(async () => {
      await db.queryAsync('DELETE FROM snapshot_sequencer_test.spaces');
    });

    describe('when the space does not exist', () => {
      it('creates a new space', () => {
        mockGetJSON.mockResolvedValueOnce(spacesSqlFixtures[0].settings);

        expect(poke(spacesSqlFixtures[0].id)).resolves.toEqual(
          spacesSqlFixtures[0].settings
        );
      });
    });

    describe('when the space exist', () => {
      it('updates a new space', async () => {
        const space = spacesSqlFixtures[1];
        const ts = (Date.now() / 1e3).toFixed();
        const query =
          'INSERT INTO spaces SET ? ON DUPLICATE KEY UPDATE updated = ?, settings = ?, name = ?, hibernated = 0';
        await db.queryAsync(query, [
          {
            id: space,
            name: space.settings.name,
            created: ts,
            updated: ts,
            settings: JSON.stringify(space.settings)
          },
          ts,
          JSON.stringify(space.settings),
          space.settings.name
        ]);

        mockGetJSON.mockResolvedValueOnce(spacesSqlFixtures[0].settings);

        expect(poke(spacesSqlFixtures[1].id)).resolves.toEqual(
          spacesSqlFixtures[0].settings
        );
      });
    });
  });
});
