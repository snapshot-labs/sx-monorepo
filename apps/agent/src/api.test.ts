import { describe, expect, test } from 'bun:test';
import { app } from './api';

describe('GET /', () => {
  test('publishes the signer and the spaces it votes in', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('signer');
    expect(body.spaces).toEqual(['robots.0cf5e.eth']);
  });

  test('is readable from the browser', async () => {
    const res = await app.request('/', {
      headers: { Origin: 'https://snapshot.box' }
    });
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});
