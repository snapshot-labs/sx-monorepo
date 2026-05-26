import {
  addOrUpdateSkin,
  addOrUpdateSpace,
  getSpace,
  sxSpaceExists
} from '../../../src/helpers/actions';
import db, { sequencerDB } from '../../../src/helpers/mysql';
import { DEFAULT_NETWORK_ID } from '../../../src/helpers/utils';
import { spacesSqlFixtures } from '../../fixtures/space';

describe('helpers/actions', () => {
  afterAll(async () => {
    await db.endAsync();
    await sequencerDB.endAsync();
  });

  const expectedSpace = {
    verified: true,
    flagged: false,
    deleted: false,
    domain: undefined,
    hibernated: false,
    turbo: false,
    name: 'Test Space',
    admins: ['0xFC01614d28595d9ea5963daD9f44C0E0F0fE10f0'],
    symbol: 'TEST',
    network: '1',
    strategies: [{ name: 'basic' }]
  };

  const expectedDeletedSpace = {
    name: 'Test deleted space',
    verified: false,
    flagged: false,
    deleted: true,
    domain: undefined,
    hibernated: false,
    turbo: false,
    admins: ['0x87D68ecFBcF53c857ABf494728Cf3DE1016b27B0'],
    symbol: 'TEST2',
    network: '1',
    strategies: [{ name: 'basic' }]
  };

  describe('getSpace()', () => {
    beforeAll(async () => {
      await Promise.all(
        spacesSqlFixtures.map(space => {
          const values = {
            ...space,
            settings: JSON.stringify(space.settings)
          };
          return db.queryAsync(
            'INSERT INTO snapshot_sequencer_test.spaces SET ?',
            values
          );
        })
      );
    });

    afterAll(async () => {
      await db.queryAsync('DELETE FROM snapshot_sequencer_test.spaces');
    });

    describe('for snapshot space', () => {
      it('returns the space for the given ID', () => {
        return expect(getSpace('test.eth')).resolves.toEqual(expectedSpace);
      });

      it('returns the space (case-insensitive) for the given ID', () => {
        return expect(getSpace('TEST.eth')).resolves.toEqual(expectedSpace);
      });

      it('returns the space for the given ID with a valid network', () => {
        return expect(
          getSpace('test.eth', false, DEFAULT_NETWORK_ID)
        ).resolves.toEqual(expectedSpace);
      });

      it('returns a snapshot space for the given ID with an invalid network', () => {
        return expect(
          getSpace('test.eth', false, 'hello-world')
        ).resolves.toEqual(expectedSpace);
      });

      it('does not return deleted space by default', () => {
        return expect(getSpace('test-deleted.eth')).resolves.toBe(false);
      });

      it('returns deleted space when asked', () => {
        return expect(getSpace('test-deleted.eth', true)).resolves.toEqual(
          expectedDeletedSpace
        );
      });

      it('returns false when no space is found', () => {
        return expect(getSpace('test-space.eth')).resolves.toBe(false);
      });
    });

    describe('for sx spaces', () => {
      it('returns the space for the given ID', () => {
        return expect(
          getSpace('0xaeee929Ca508Dd1F185a8E74F4a9c37c25595c25', false, 'eth')
        ).resolves.toEqual({
          network: 0
        });
      });

      it('returns false when the space does not exist', () => {
        return expect(
          getSpace('not-existing-space-id', false, 'eth')
        ).resolves.toBe(false);
      });
    });
  });

  describe('sxSpaceExists()', () => {
    const mapping = {
      sn: '0x001080f1ced38269d7a32068700179c6335dee568f8599cf74b120869f8ec641',
      arb1: '0xFd36252770642Ac48FC3A06d7A1D00be8946dd18',
      oeth: '0x82572911308D2579f15e3cF21402Dcf1D5408300',
      eth: '0xaeee929Ca508Dd1F185a8E74F4a9c37c25595c25',
      base: '0x9f0c8eB80FC802f2466f44539919975443934f4B',
      mnt: '0x8a4E34e2658566DD01978557367F5361552CaFC8',
      ape: '0x1e5Fe72BD3e3E9eecE2a575937173b1AD4a134Ed',
      // Testnets
      sep: '0xf4b413A7778C099a3dB61F620b805005B2186B05',
      'sn-sep':
        '0x015cce180cfd6d588f1e7b8dc53108556d8e871400294d0cf6382e77b0553818',
      curtis: '0xf6238F73A87D390CB00b2B380D2B777E13Fe2725'
    };

    it.each(Object.entries(mapping))(
      'returns true when it exists for %s',
      async (network, id) => {
        return expect(sxSpaceExists(network, id)).resolves.toEqual(true);
      }
    );

    it('returns false when it does not exist', async () => {
      return expect(sxSpaceExists('sep', mapping['eth'])).resolves.toEqual(
        false
      );
    });
  });

  describe('addOrUpdateSpace', () => {
    const testId = 'test-add-or-update-space.eth';

    afterEach(async () => {
      await db.queryAsync(
        'DELETE FROM snapshot_sequencer_test.spaces WHERE id = ?',
        [testId]
      );
    });

    describe('cleanup delegationPortal', () => {
      it('set the given delegationNetwork', async () => {
        const settings = {
          ...spacesSqlFixtures[0].settings,
          delegationPortal: { delegationNetwork: '1234' }
        };
        await addOrUpdateSpace(testId, settings);
        const space = (
          await db.queryAsync('SELECT * FROM spaces WHERE id = ?', [testId])
        )[0];

        expect(JSON.parse(space.settings).delegationPortal).toEqual(
          settings.delegationPortal
        );
      });

      it('set a default delegationNetwork when missing', async () => {
        const settings = {
          ...spacesSqlFixtures[0].settings,
          delegationPortal: { delegationType: 'compound-governor' }
        };
        await addOrUpdateSpace(testId, settings);
        const space = (
          await db.queryAsync('SELECT * FROM spaces WHERE id = ?', [testId])
        )[0];

        expect(JSON.parse(space.settings).delegationPortal).toEqual({
          ...settings.delegationPortal,
          delegationNetwork: '1'
        });
      });
    });

    describe('cleanup domain', () => {
      it('normalize the domain', async () => {
        const settings = {
          ...spacesSqlFixtures[0].settings,
          domain: 'https://vote.snapshot.org/'
        };
        await addOrUpdateSpace(testId, settings);
        const space = (
          await db.queryAsync('SELECT * FROM spaces WHERE id = ?', [testId])
        )[0];

        expect(JSON.parse(space.settings).domain).toEqual('vote.snapshot.org');
      });
    });
  });

  describe('addOrUpdateSkin', () => {
    afterAll(async () => {
      await db.queryAsync('DELETE FROM snapshot_sequencer_test.skins');
    });

    it('adds a new skin when it does not exist', async () => {
      const testId = 'test-new-skin-ids';
      const skinSettings = {
        bg_color: '#000000',
        link_color: '#ffffff',
        text_color: '#000000',
        content_color: '#ffffff',
        border_color: '#ffffff',
        heading_color: '#ffffff',
        primary_color: '#ffffff'
      };
      await addOrUpdateSkin(testId, skinSettings);
      const skin = (
        await db.queryAsync('SELECT * FROM skins WHERE id = ?', [testId])
      )[0];
      expect(skin).toEqual({
        id: testId,
        bg_color: '#000000',
        link_color: '#ffffff',
        text_color: '#000000',
        content_color: '#ffffff',
        border_color: '#ffffff',
        heading_color: '#ffffff',
        primary_color: '#ffffff',
        header_color: null,
        theme: 'light',
        logo: null
      });
    });

    it('updates an existing skin', async () => {
      const testId = 'test-update-skin-id';
      await db.queryAsync(
        'INSERT INTO skins (id, bg_color, link_color, text_color, content_color, border_color, heading_color, primary_color, header_color, theme) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          testId,
          '#000000',
          '#000000',
          '#000000',
          '#000000',
          '#000000',
          '#000000',
          '#000000',
          '#000000',
          'light'
        ]
      );
      await addOrUpdateSkin(testId, {
        bg_color: '#FFFF00',
        link_color: '#FFFFFF'
      });
      const skin = (
        await db.queryAsync('SELECT * FROM skins WHERE id = ?', [testId])
      )[0];
      expect(skin).toEqual({
        id: testId,
        bg_color: '#FFFF00',
        link_color: '#FFFFFF',
        text_color: null,
        content_color: null,
        border_color: null,
        heading_color: null,
        primary_color: null,
        header_color: null,
        theme: 'light',
        logo: null
      });

      await addOrUpdateSkin(testId, { theme: 'dark' });
      const skin2 = (
        await db.queryAsync('SELECT * FROM skins WHERE id = ?', [testId])
      )[0];
      expect(skin2).toEqual({
        id: testId,
        bg_color: null,
        link_color: null,
        text_color: null,
        content_color: null,
        border_color: null,
        heading_color: null,
        primary_color: null,
        header_color: null,
        theme: 'dark',
        logo: null
      });
    });
  });
});
