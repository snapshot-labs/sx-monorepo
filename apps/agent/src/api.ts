import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  GET_CONTEXT_TYPES,
  SET_CONTEXT_TYPES,
  Signed,
  verifySigner
} from './auth';
import { AGENT_SIGNER_ADDRESS } from './clients/sequencer';
import { DRY_RUN, SPACE_IDS } from './config';
import { contexts, db } from './db';
import pkg from '../package.json' with { type: 'json' };

const CONTEXT_LIMIT = 5000;

export const app = new Hono();

app.use('/*', cors());

app.get('/', c =>
  c.json({
    name: pkg.name,
    version: pkg.version,
    spaces: SPACE_IDS,
    signer: AGENT_SIGNER_ADDRESS,
    dryRun: DRY_RUN
  })
);

app.post('/context/get', async c => {
  const body = await c.req.json<Signed<object>>();

  try {
    await verifySigner(GET_CONTEXT_TYPES, body);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 401);
  }

  const rows = await db
    .select({ space: contexts.space, context: contexts.context })
    .from(contexts)
    .where(eq(contexts.address, body.from));

  return c.json({ contexts: rows });
});

app.post('/context/set', async c => {
  const body = await c.req.json<Signed<{ space: string; context: string }>>();

  try {
    await verifySigner(SET_CONTEXT_TYPES, body);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 401);
  }

  if (!body.space) return c.json({ error: 'space is required' }, 400);
  if (body.context.length > CONTEXT_LIMIT) {
    return c.json(
      { error: `context is over ${CONTEXT_LIMIT} characters` },
      400
    );
  }

  const now = Math.floor(Date.now() / 1000);

  if (!body.context.trim()) {
    await db
      .delete(contexts)
      .where(
        and(eq(contexts.address, body.from), eq(contexts.space, body.space))
      );

    return c.json({ removed: true });
  }

  await db
    .insert(contexts)
    .values({
      address: body.from,
      space: body.space,
      context: body.context,
      created: now,
      updated: now
    })
    .onConflictDoUpdate({
      target: [contexts.address, contexts.space],
      set: { context: body.context, updated: now }
    });

  return c.json({ saved: true });
});
