import { describe, expect, it, vi } from 'vitest';
import { send } from './send';

describe('send helper', () => {
  it('delegates to client.send', async () => {
    const expected = { hash: '0x123' };
    const client = { send: vi.fn(async () => expected) };

    await expect(send(client, {})).resolves.toBe(expected);
    expect(client.send).toHaveBeenCalledWith({});
  });
});
