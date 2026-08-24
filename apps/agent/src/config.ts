import 'dotenv/config';

const DEFAULT_SPACES = ['robots.0cf5e.eth'];

export const PORT = Number(process.env.PORT ?? 3006);

export const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgres://postgres:password@localhost:5432/agent';

export const HUB_URL =
  process.env.HUB_URL ?? 'https://hub.snapshot.org/graphql';

export const SUPPORTED_TYPES = ['single-choice', 'basic'];
export const SPACE_IDS: string[] = process.env.SPACES
  ? process.env.SPACES.split(',')
      .map(space => space.trim())
      .filter(Boolean)
  : DEFAULT_SPACES;

export const AGENT_SIGNER_ADDRESS = process.env.AGENT_SIGNER_ADDRESS ?? '';

export const DRY_RUN = process.env.DRY_RUN !== 'false';
export const TICK_INTERVAL = 60_000;
export const CAST_WINDOW = 24 * 60 * 60;
