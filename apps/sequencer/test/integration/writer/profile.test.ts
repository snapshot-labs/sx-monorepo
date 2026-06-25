import db, { sequencerDB } from '../../../src/helpers/mysql';
import * as utils from '../../../src/helpers/utils';
import { action } from '../../../src/writer/profile';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('writer/profile', () => {
  afterAll(async () => {
    await db.queryAsync('DELETE FROM users');
    await db.endAsync();
    await sequencerDB.endAsync();
  });

  describe('action()', () => {
    const userProfile = {
      name: 'Test name',
      avatar: 'https://snapshot.org',
      about: 'Bio',
      twitter: '',
      github: ''
    };

    beforeEach(async () => {
      await db.queryAsync('INSERT INTO users SET ?', [
        {
          id: '0x0',
          ipfs: '0',
          created: 0,
          profile: JSON.stringify(userProfile)
        }
      ]);
    });

    afterEach(async () => {
      await db.queryAsync('DELETE FROM users WHERE id = ?', ['0x0']);
    });

    it('clears the stamp cache if the avatar has changed', async () => {
      const spy = jest
        .spyOn(utils, 'clearStampCache')
        .mockResolvedValue(undefined);

      await action(
        {
          profile: JSON.stringify({
            avatar: 'https://newurl.com',
            name: userProfile.name
          }),
          timestamp: 0,
          from: '0x0'
        },

        '1'
      );

      return expect(spy).toHaveBeenCalledTimes(1);
    });

    it('clears the stamp cache if the name has changed', async () => {
      const spy = jest
        .spyOn(utils, 'clearStampCache')
        .mockResolvedValue(undefined);

      await action(
        {
          profile: JSON.stringify({
            avatar: userProfile.avatar,
            name: 'New name'
          }),
          timestamp: 0,
          from: '0x0'
        },

        '1'
      );

      return expect(spy).toHaveBeenCalledTimes(1);
    });

    it('does not clear the stamp cache if the avatar nor the name has changed', () => {
      const spy = jest
        .spyOn(utils, 'clearStampCache')
        .mockResolvedValue(undefined);

      action(
        {
          profile: JSON.stringify({
            avatar: userProfile.avatar,
            name: userProfile.name
          }),
          timestamp: 0,
          from: '0x0'
        },
        '2'
      );

      return expect(spy).not.toHaveBeenCalled();
    });
  });
});
