import { sendError, ServerError } from '../../../src/helpers/utils';

function mockResponse() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('sendError()', () => {
  it('should hide the details of Error instances', () => {
    const res = mockResponse();
    const err = Object.assign(new Error('connect ECONNREFUSED'), {
      sql: 'SELECT id FROM networks',
      address: '10.0.0.1',
      port: 3306
    });

    sendError(res, err);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'server_error',
      error_description: 'failed'
    });
  });

  it('should keep the message of ServerError', () => {
    const res = mockResponse();

    sendError(res, new ServerError('unable to resolve space controller'));

    expect(JSON.stringify(res.json.mock.calls[0][0])).toBe(
      '{"error":"server_error","error_description":"unable to resolve space controller"}'
    );
  });

  it('should keep string descriptions', () => {
    const res = mockResponse();

    sendError(res, 'wrong timestamp');

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'client_error',
      error_description: 'wrong timestamp'
    });
  });

  it('should keep plain object descriptions', () => {
    const res = mockResponse();
    const description = { code: 400, message: 'invalid strategy' };

    sendError(res, description);

    expect(res.json).toHaveBeenCalledWith({
      error: 'server_error',
      error_description: description
    });
  });
});
