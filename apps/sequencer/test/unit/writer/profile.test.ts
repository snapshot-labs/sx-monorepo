import { capture } from '@snapshot-labs/snapshot-sentry';
import db from '../../../src/helpers/mysql';
import { clearStampCache } from '../../../src/helpers/utils';
import { action } from '../../../src/writer/profile';

jest.mock('@snapshot-labs/snapshot-sentry', () => ({ capture: jest.fn() }));
jest.mock('../../../src/helpers/mysql', () => ({
  __esModule: true,
  default: { queryAsync: jest.fn() }
}));
jest.mock('../../../src/helpers/utils', () => ({
  jsonParse: JSON.parse,
  clearStampCache: jest.fn()
}));

describe('writer/profile', () => {
  const message = {
    from: '0x123',
    timestamp: 1,
    profile: JSON.stringify({ name: 'updated', avatar: 'ipfs://avatar' })
  };

  beforeEach(() => {
    (db.queryAsync as jest.Mock).mockReset().mockResolvedValue([]);
    jest.mocked(clearStampCache).mockReset();
  });

  it('reports cache failures without rejecting the saved profile', async () => {
    const err = new Error('Stamp network failure');
    jest.mocked(clearStampCache).mockRejectedValue(err);
    await expect(action(message, 'ipfs')).resolves.toBeUndefined();
    expect(clearStampCache).toHaveBeenCalledTimes(2);
    expect(capture).toHaveBeenCalledTimes(2);
    expect(capture).toHaveBeenCalledWith(err);
  });

  it('does not clear unchanged profile fields', async () => {
    (db.queryAsync as jest.Mock).mockResolvedValueOnce([
      JSON.parse(message.profile)
    ]);
    await action(message, 'ipfs');
    expect(clearStampCache).not.toHaveBeenCalled();
  });

  it('does not wait for best-effort cache clearing', async () => {
    jest
      .mocked(clearStampCache)
      .mockImplementation(() => new Promise(() => {}));
    await expect(action(message, 'ipfs')).resolves.toBeUndefined();
  });

  it('still rejects a database failure before clearing the cache', async () => {
    const err = new Error('Database unavailable');
    (db.queryAsync as jest.Mock).mockRejectedValueOnce(err);
    await expect(action(message, 'ipfs')).rejects.toBe(err);
    expect(clearStampCache).not.toHaveBeenCalled();
  });

  describe('verify()', () => {
    it.todo('rejects if the schema is invalid');
  });
});
