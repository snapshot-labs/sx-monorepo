import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { AGENT_SIGNER_ADDRESS } from './clients/sequencer';
import { DRY_RUN, SPACE_IDS } from './config';
import { AGENT_CONTEXT } from './context';
import pkg from '../package.json' with { type: 'json' };

export const app = new Hono();

app.use('/*', cors());

app.get('/', c =>
  c.json({
    name: pkg.name,
    version: pkg.version,
    spaces: SPACE_IDS,
    signer: AGENT_SIGNER_ADDRESS,
    context: AGENT_CONTEXT,
    dryRun: DRY_RUN
  })
);
