import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  GET_CONTEXT_TYPES,
  SET_CONTEXT_TYPES,
  Signed,
  verifySigner
} from './auth';
import { createAccount } from './cdp';
import { DRY_RUN, SPACE_IDS } from './config';
import { contexts, db, signers } from './db';
import pkg from '../package.json' with { type: 'json' };

const CONTEXT_LIMIT = 5000;

export const app = new Hono();

app.use('/*', cors());

app.get('/', c =>
  c.json({
    name: pkg.name,
    version: pkg.version,
    spaces: SPACE_IDS,
    dryRun: DRY_RUN
  })
);

async function getOrCreateSigner(address: string): Promise<string> {
  const [existing] = await db
    .select({ signer: signers.signer })
    .from(signers)
    .where(eq(signers.address, address));
  if (existing) return existing.signer;

  const account = await createAccount();

  const [row] = await db
    .insert(signers)
    .values({
      address,
      name: account.name,
      signer: account.address,
      created: Math.floor(Date.now() / 1000)
    })
    .onConflictDoNothing()
    .returning({ signer: signers.signer });

  return row?.signer ?? getOrCreateSigner(address);
}

app.post('/context/get', async c => {
  const body = await c.req.json<Signed<object>>();

  try {
    await verifySigner(GET_CONTEXT_TYPES, body);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 401);
  }

  const address = body.from.toLowerCase();
  const [signer, rows] = await Promise.all([
    getOrCreateSigner(address),
    db
      .select({ space: contexts.space, context: contexts.context })
      .from(contexts)
      .where(eq(contexts.address, address))
  ]);

  return c.json({ signer, contexts: rows });
});

app.post('/context/set', async c => {
  const body = await c.req.json<Signed<{ space: string; context: string }>>();

  try {
    await verifySigner(SET_CONTEXT_TYPES, body);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 401);
  }

  const now = Math.floor(Date.now() / 1000);

  if (!body.context.trim()) {
    await db
      .delete(contexts)
      .where(
        and(
          eq(contexts.address, body.from.toLowerCase()),
          eq(contexts.space, body.space)
        )
      );

    return c.json({ removed: true });
  }

  if (!SPACE_IDS.includes(body.space)) {
    return c.json({ error: 'space is not supported by this agent' }, 400);
  }

  if (body.context.length > CONTEXT_LIMIT) {
    return c.json(
      { error: `context is over ${CONTEXT_LIMIT} characters` },
      400
    );
  }

  await db
    .insert(contexts)
    .values({
      address: body.from.toLowerCase(),
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
