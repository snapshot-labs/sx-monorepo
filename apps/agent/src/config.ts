import 'dotenv/config';

const DEFAULT_SPACES = ['robots.0cf5e.eth'];

export const PORT = Number(process.env.PORT ?? 3007);

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

export const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY ?? '';

export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';
export const MODEL = process.env.MODEL ?? 'anthropic/claude-sonnet-5';

export const CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const;
export const MIN_CONFIDENCE = 'medium';

export const TICK_INTERVAL = 60_000;
export const CAST_WINDOW = 24 * 60 * 60;
export const CAST_BATCH = 10;
export const CAST_LEASE = 5 * 60;
export const CAST_GAP = 3000;
export const VOTE_APP = 'snapshot-agent';
export const REASON_LIMIT = 500;
export const BODY_LIMIT = 4000;
export const PREDICT_BATCH = 10;
export const PREDICT_LEASE = 10 * 60;
export const MAX_ATTEMPTS = 3;

export const DRY_RUN = process.env.DRY_RUN === 'true';
