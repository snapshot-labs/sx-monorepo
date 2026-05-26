import omit from 'lodash/omit';
import db from '../../../src/helpers/mysql';
import * as writer from '../../../src/writer/alias';
import input from '../../fixtures/writer-payload/alias.json';

describe('writer/alias', () => {
  describe('verify()', () => {
    const msg = JSON.parse(input.msg);

    beforeEach(() => {
      jest.spyOn(db, 'queryAsync').mockResolvedValue([]);
    });
    const invalidMsg = [
      [
        'unknown field',
        { ...msg, payload: { ...msg.payload, title: 'title' } }
      ],
      ['missing field', { msg, payload: omit(msg.payload, 'alias') }],
      [
        'not matching type',
        { ...msg, payload: { ...msg.payload, alias: true } }
      ]
    ];

    it.each(invalidMsg)('rejects on %s', async (title: string, val: any) => {
      await expect(
        writer.verify({ ...input, msg: JSON.stringify(val) })
      ).rejects.toMatch('format');
    });

    it('rejects when the alias is the same as the address', async () => {
      const msg = JSON.parse(input.msg);
      const body = {
        ...input,
        msg: JSON.stringify({
          ...msg,
          payload: { ...msg.payload, alias: msg.from }
        })
      };

      await expect(writer.verify(body)).rejects.toMatch(
        'alias cannot be the same as the address'
      );
    });

    it('succeed when the address is not the same as the alias', async () => {
      const msg = JSON.parse(input.msg);
      const body = {
        ...input,
        msg: JSON.stringify({
          ...msg,
          payload: {
            ...msg.payload,
            alias: '0x0000000000000000000000000000000000000000'
          }
        })
      };

      await expect(writer.verify(body)).resolves;
    });
  });
});
