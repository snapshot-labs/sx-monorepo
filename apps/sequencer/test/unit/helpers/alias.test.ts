import { verifyAlias } from '../../../src/helpers/alias';
import db from '../../../src/helpers/mysql';

jest.mock('../../../src/helpers/mysql', () => ({
  __esModule: true,
  default: { queryAsync: jest.fn() }
}));

const mockedQueryAsync = db.queryAsync as jest.Mock;

describe('verifyAlias()', () => {
  beforeEach(() => {
    mockedQueryAsync.mockReset();
  });

  it('resolves when the sender is the creator', async () => {
    const body = { address: '0xabc', data: { message: { from: '0xabc' } } };
    await expect(verifyAlias('vote', body)).resolves.toBeUndefined();
  });

  it('rejects when the type is not alias-executable', async () => {
    const body = { address: '0xaaa', data: { message: { from: '0xbbb' } } };
    await expect(verifyAlias('settings', body)).rejects.toMatch(
      'alias not allowed'
    );
  });

  it('rejects alias creation signed by an alias (owner-only)', async () => {
    const body = { address: '0xaaa', data: { message: { from: '0xbbb' } } };
    await expect(verifyAlias('alias', body)).rejects.toMatch(
      'alias not allowed'
    );
  });

  it('rejects alias revocation signed by an alias (owner-only)', async () => {
    const body = { address: '0xaaa', data: { message: { from: '0xbbb' } } };
    await expect(verifyAlias('revoke-alias', body)).rejects.toMatch(
      'alias not allowed'
    );
  });

  it('rejects delete-proposal when the author is an EVM address', async () => {
    const body = {
      address: '0x91FD2c8d24767db4Ece7069AA27832ffaf8590f3',
      data: { message: { from: '0x91FD2c8d24767db4Ece7069AA27832ffaf8590f4' } }
    };
    await expect(verifyAlias('delete-proposal', body)).rejects.toMatch(
      'alias not allowed'
    );
  });

  it('resolves delete-proposal when the author is a Starknet address with a valid alias', async () => {
    const body = {
      address: '0x91FD2c8d24767db4Ece7069AA27832ffaf8590f3',
      data: {
        message: {
          from: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
        }
      }
    };
    mockedQueryAsync.mockResolvedValueOnce([{ 1: 1 }]);
    await expect(verifyAlias('delete-proposal', body)).resolves.toBeUndefined();
    expect(mockedQueryAsync).toHaveBeenCalledTimes(1);
  });

  it("rejects with 'wrong alias' when the type is allowed but no alias row exists", async () => {
    const body = {
      address: '0x91FD2c8d24767db4Ece7069AA27832ffaf8590f3',
      data: { message: { from: '0x91FD2c8d24767db4Ece7069AA27832ffaf8590f4' } }
    };
    mockedQueryAsync.mockResolvedValueOnce([]);
    await expect(verifyAlias('vote', body)).rejects.toMatch('wrong alias');
  });
});
