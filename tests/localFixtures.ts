import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Fixture files are written one level above the repo root by the local
// private-voting orchestration (hub + keypers). They are machine-local
// artifacts and never exist in CI, so specs that depend on them must
// skip instead of failing at collection time.
export const SKIP_REASON =
  'requires the local private-voting stack; fixture file is missing';

function readIfExists(name: string): string | null {
  try {
    return readFileSync(resolve(__dirname, '..', '..', name), 'utf8');
  } catch {
    return null;
  }
}

export function readProposalId(): string | null {
  const raw = readIfExists('.e2e-proposal-id');
  return raw ? raw.trim() : null;
}

export type WeightedFixture = {
  id: string;
  space: string;
  scores: number[];
  ballots: number;
};

export function readWeightedFixture(): WeightedFixture | null {
  const raw = readIfExists('.e2e-weighted-proposal.json');
  return raw ? (JSON.parse(raw) as WeightedFixture) : null;
}
