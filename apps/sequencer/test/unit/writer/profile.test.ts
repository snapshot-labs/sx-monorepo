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

  afterEach(() => jest.restoreAllMocks());

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

  it('starts both cache clears in parallel and waits for both', async () => {
    let resolveAvatar: () => void = () => {};
    let resolveName: () => void = () => {};
    const avatar = new Promise<void>(resolve => {
      resolveAvatar = resolve;
    });
    const name = new Promise<void>(resolve => {
      resolveName = resolve;
    });
    let notifyStarted: () => void = () => {};
    const started = new Promise<void>(resolve => {
      notifyStarted = resolve;
    });
    jest.mocked(clearStampCache).mockImplementation(async type => {
      if (type === 'name') notifyStarted();
      await (type === 'avatar' ? avatar : name);
      return {};
    });
    let isFinished = false;
    const result = action(message, 'ipfs').then(() => {
      isFinished = true;
    });
    await started;
    expect(clearStampCache).toHaveBeenCalledTimes(2);
    expect(isFinished).toBe(false);
    resolveAvatar();
    await avatar;
    expect(isFinished).toBe(false);
    resolveName();
    await result;
    expect(isFinished).toBe(true);
  });

  it('bounds cache requests to five seconds and reports aborts without rejecting', async () => {
    const controller = new AbortController();
    const timeout = jest
      .spyOn(AbortSignal, 'timeout')
      .mockReturnValue(controller.signal);
    const err = new Error('Stamp request timed out');
    let notifyStarted: () => void = () => {};
    const started = new Promise<void>(resolve => {
      notifyStarted = resolve;
    });
    jest.mocked(clearStampCache).mockImplementation((_type, _id, signal) => {
      const pending = new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(err), { once: true });
      });
      if (_type === 'name') notifyStarted();
      return pending;
    });
    const result = action(message, 'ipfs');
    await started;
    expect(timeout).toHaveBeenCalledTimes(2);
    expect(timeout).toHaveBeenCalledWith(5000);
    controller.abort();
    await expect(result).resolves.toBeUndefined();
    expect(capture).toHaveBeenCalledTimes(2);
    expect(capture).toHaveBeenCalledWith(err);
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
