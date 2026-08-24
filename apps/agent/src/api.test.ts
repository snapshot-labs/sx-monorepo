import { describe, expect, test } from 'bun:test';
import { app } from './api';
import { AGENT_CONTEXT } from './context';

describe('GET /', () => {
  test('publishes the signer and the shared context', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.context).toBe(AGENT_CONTEXT);
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
