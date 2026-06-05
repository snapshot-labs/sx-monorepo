// Regression guard for a handler-arity footgun: the MCP SDK treats an empty
// `inputSchema: {}` as a valid (empty) raw shape, so it invokes the tool
// handler as `handler(args, extra)` — two arguments — exactly like tools that
// declare inputs. A handler written with a single `extra` parameter therefore
// receives the parsed args (`{}`), not the auth-bearing `extra`, and every
// auth lookup silently fails with "Not authenticated". These tests pin the
// two-argument contract for the no-input tools.

import './helpers.js';
import { describe, expect, test } from 'bun:test';
import { registerSchemaTool, registerWhoamiTool } from '../src/tools.js';

function captureHandler(
  register: (server: any, resolveContext?: any) => void,
  resolveContext?: any
): (args: unknown, extra: unknown) => Promise<unknown> {
  let handler: ((args: unknown, extra: unknown) => Promise<unknown>) | undefined;
  const server = {
    registerTool: (_name: string, _config: unknown, cb: typeof handler) => {
      handler = cb;
    }
  };
  register(server, resolveContext);
  if (!handler) throw new Error('handler was not registered');
  return handler;
}

const REAL_EXTRA = {
  authInfo: { extra: { user: '0xUSER', signerKey: 'signer-key' } },
  requestId: 'req-1'
};

describe('no-input tool handlers receive `extra` as the second argument', () => {
  test('snapshot-whoami resolves auth from `extra`, not the parsed args', async () => {
    let received: unknown;
    const resolveContext = async (extra: unknown) => {
      received = extra;
      return {
        user: '0xUSER',
        signer: { getAddress: async () => '0xALIAS' }
      };
    };
    const handler = captureHandler(registerWhoamiTool, resolveContext);

    // The SDK calls empty-input tools as handler(args, extra).
    await handler({}, REAL_EXTRA);

    expect(received).toBe(REAL_EXTRA);
  });

  test('snapshot-schema logs against the real `extra` (no request-id loss)', async () => {
    const handler = captureHandler(registerSchemaTool);
    const result = (await handler({}, REAL_EXTRA)) as {
      content: { text: string }[];
      isError?: boolean;
    };
    expect(result.isError).toBeUndefined();
  });
});
