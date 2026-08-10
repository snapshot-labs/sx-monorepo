import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getJSON } from './utils';

const fetchMock = vi.fn();

function ok(body: unknown) {
  return { ok: true, status: 200, statusText: 'OK', json: async () => body };
}

function status(code: number, statusText: string) {
  return {
    ok: false,
    status: code,
    statusText,
    json: async () => {
      throw new Error('not json');
    }
  };
}

describe('getJSON', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('returns the body when the gateway answers', async () => {
    fetchMock.mockResolvedValue(ok({ name: 'Emerge' }));

    await expect(getJSON('ipfs://bafyMetadata')).resolves.toEqual({
      name: 'Emerge'
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // The metadata of a space whose fetch fails here is lost for good: the writer
  // leaves the pointer null and nothing ever revisits it. A gateway that is
  // briefly unavailable must not cost us the row.
  it('retries a gateway failure and keeps the metadata', async () => {
    fetchMock
      .mockResolvedValueOnce(status(503, 'Service Unavailable'))
      .mockResolvedValueOnce(ok({ name: 'Emerge' }));

    await expect(getJSON('ipfs://bafyMetadata')).resolves.toEqual({
      name: 'Emerge'
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries a request that never reached the gateway', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(ok({ name: 'Emerge' }));

    await expect(getJSON('ipfs://bafyMetadata')).resolves.toEqual({
      name: 'Emerge'
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries a timeout', async () => {
    const timeout = new DOMException('The operation timed out', 'TimeoutError');

    fetchMock
      .mockRejectedValueOnce(timeout)
      .mockResolvedValueOnce(ok({ name: 'Emerge' }));

    await expect(getJSON('ipfs://bafyMetadata')).resolves.toEqual({
      name: 'Emerge'
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // A 404 is the gateway telling us what it has, and it will say the same thing
  // however many times we ask. Retrying it only stalls the block.
  it('does not retry a definite answer', async () => {
    fetchMock.mockResolvedValue(status(404, 'Not Found'));

    await expect(getJSON('ipfs://bafyMetadata')).rejects.toThrow('Not Found');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives up rather than retrying forever', async () => {
    fetchMock.mockResolvedValue(status(503, 'Service Unavailable'));

    await expect(getJSON('ipfs://bafyMetadata')).rejects.toThrow(
      'Service Unavailable'
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not reach the network for a blank uri', async () => {
    await expect(getJSON('')).rejects.toThrow('Invalid URI');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
