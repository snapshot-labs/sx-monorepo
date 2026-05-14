import {
  containsFlaggedLinks,
  flaggedAddresses,
  flaggedLinks,
  loadModerationData,
  setData
} from '../../../src/helpers/moderation';

describe('moderation', () => {
  describe('loadModerationData()', () => {
    describe('on success', () => {
      it('loads moderation data from sidekick', async () => {
        const result = await loadModerationData();

        expect(result!.flaggedIps).not.toHaveLength(0);
        expect(result!.flaggedAddresses).not.toHaveLength(0);
        expect(result!.flaggedLinks).not.toHaveLength(0);
      });
    });

    describe('on error', () => {
      it.each([
        ['no response', 'http://localhost:9999'],
        ['empty url', ''],
        ['invalid hostname', 'test'],
        ['timeout', 'https://httpstat.us/200?sleep=10000']
      ])(
        'returns nothing on network error (%s)',
        async (title, url) => {
          await expect(loadModerationData(url)).resolves.toBe(undefined);
        },
        6e3
      );

      it('returns nothing on not-json response', async () => {
        await expect(loadModerationData('https://snapshot.org')).resolves.toBe(
          undefined
        );
      });
    });

    describe('containsFlaggedLinks()', () => {
      beforeAll(() => {
        setData({
          flaggedLinks: [
            'https://a.com',
            'http://xyz.com',
            'abc.com',
            'test.com/abc'
          ]
        });
      });

      afterAll(() => {
        setData({ flaggedLinks: [] });
      });

      it('returns true if body contains flagged links', () => {
        expect(containsFlaggedLinks('this is a link https://a.com')).toBe(true);
        expect(
          containsFlaggedLinks(
            'this is a link https://abc.com in this test content'
          )
        ).toBe(true);
      });

      it('returns true if body contains flagged links (case insensitive)', () => {
        expect(containsFlaggedLinks('this is a link https://A.com')).toBe(true);
        expect(containsFlaggedLinks('this is a link https://ABC.com')).toBe(
          true
        );
        expect(containsFlaggedLinks('this is a link HTTPS://ABC.COM')).toBe(
          true
        );
        expect(
          containsFlaggedLinks('this is a link https://test.com/ABC')
        ).toBe(true);
      });

      it('returns true if body contains flagged links with other path', () => {
        expect(
          containsFlaggedLinks('this is a link https://a.com/abc/abc')
        ).toBe(true);
        expect(containsFlaggedLinks('this is a link http://xyz.com/abc')).toBe(
          true
        );
        expect(containsFlaggedLinks('this is a link a.com/abc')).toBe(true);
        expect(containsFlaggedLinks('this is a link test.com/abc')).toBe(true);
      });

      it('returns false if body contains flagged links with different path than flagged path', () => {
        expect(containsFlaggedLinks('this is a link test.com')).toBe(false);
        expect(containsFlaggedLinks('this is a link http://test.com')).toBe(
          false
        );
        expect(
          containsFlaggedLinks('this is a link http://test.com/test')
        ).toBe(false);
      });

      it('returns true if body contains flagged links with http or https and without protocol', () => {
        expect(containsFlaggedLinks('this is a link http://abc.com')).toBe(
          true
        );
        expect(containsFlaggedLinks('this is a link https://abc.com')).toBe(
          true
        );
        expect(containsFlaggedLinks('this is a link abc.com')).toBe(true);
        expect(containsFlaggedLinks('this is a link http://a.com')).toBe(true);
        expect(containsFlaggedLinks('this is a link https://a.com')).toBe(true);
        expect(containsFlaggedLinks('this is a link a.com')).toBe(true);
        expect(containsFlaggedLinks('this is a link http://xyz.com')).toBe(
          true
        );
        expect(containsFlaggedLinks('this is a link https://xyz.com')).toBe(
          true
        );
        expect(containsFlaggedLinks('this is a link xyz.com')).toBe(true);
      });

      it('returns true if body contains flagged links with http or https and without protocol', () => {
        expect(containsFlaggedLinks('this is a link https://www.abc.com')).toBe(
          true
        );
        expect(containsFlaggedLinks('this is a link http://abc.a.com')).toBe(
          true
        );
        expect(containsFlaggedLinks('this is a link xyz.a.com')).toBe(true);
      });

      it('returns false if body does not contain flagged links', () => {
        expect(containsFlaggedLinks('this is a link https://b.com')).toBe(
          false
        );
      });

      it('returns false if body does not contain flagged links without special chars', () => {
        expect(containsFlaggedLinks('this is a link https://a1com')).toBe(
          false
        );
      });
    });

    describe('setData()', () => {
      afterAll(() => {
        setData({ flaggedLinks: [] });
      });

      it('removes invalid data from flaggedLink', () => {
        // @ts-ignore
        setData({ flaggedLinks: ['https://a.com', null, false, '', 0] });
        expect(flaggedLinks).toEqual(['https://a.com']);
      });

      it('lower cases the flaggedAddresses', () => {
        setData({ flaggedAddresses: ['0xAa'] });
        expect(flaggedAddresses).toEqual(['0xaa']);
      });
    });
  });
});
