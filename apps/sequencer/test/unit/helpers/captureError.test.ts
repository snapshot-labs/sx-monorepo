import { capture } from '@snapshot-labs/snapshot-sentry';
import { captureError } from '../../../src/helpers/utils';

jest.mock('@snapshot-labs/snapshot-sentry', () => ({ capture: jest.fn() }));

const mockedCapture = capture as jest.Mock;

describe('captureError()', () => {
  beforeEach(() => {
    mockedCapture.mockReset();
  });

  it('captures errors', () => {
    captureError(new Error('boom'), undefined, [504]);
    expect(mockedCapture).toHaveBeenCalledTimes(1);
  });

  it('ignores errors with an ignored code', () => {
    captureError({ code: 504, message: 'Gateway Timeout' }, undefined, [504]);
    expect(mockedCapture).not.toHaveBeenCalled();
  });

  it('ignores request timeouts', () => {
    captureError(new Error('Request timeout after 30000ms'), undefined, [504]);
    expect(mockedCapture).not.toHaveBeenCalled();
  });
});
