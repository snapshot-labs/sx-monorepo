/**
 * A key rotation needs a restart, and at boot the sequencer moves every proposal
 * that has not started to the new key: voting on them then works when they open.
 * A proposal that has started keeps its frozen key, so the votes already cast count.
 */

import db, { sequencerDB } from '../../../src/helpers/mysql';
import { resetIssuer } from '../../../src/helpers/sgpAttestation';
import {
  getEligibilityKey,
  refreezeEligibilityKey
} from '../../../src/helpers/teEligibility';
import { insertProposal } from '../../fixtures/proposal';

const OLD_KEY = `0x${'cd'.repeat(48)}`;
const NOW = Math.floor(Date.now() / 1e3);
const PENDING = `0x${'e1'.repeat(32)}`;
const PENDING_PUBLIC = `0x${'e2'.repeat(32)}`;
const ACTIVE = `0x${'e3'.repeat(32)}`;

const committee = { v: 1, thresholdT: 2, eligibilityKey: OLD_KEY };

async function frozenKey(id: string): Promise<{ key: string; t: number }> {
  const [row] = await db.queryAsync(
    'SELECT te_sgp_config FROM proposals WHERE id = ?',
    [id]
  );
  const config =
    typeof row.te_sgp_config === 'string'
      ? JSON.parse(row.te_sgp_config)
      : row.te_sgp_config;
  return { key: config.eligibilityKey, t: config.thresholdT };
}

beforeAll(async () => {
  process.env.TE_ELIGIBILITY_PRIVATE_KEY = `0x${'11'.repeat(32)}`;
  resetIssuer();
  const config = JSON.stringify(committee);
  await insertProposal({
    id: PENDING,
    privacy: 'shutter-elgamal',
    start: NOW + 3600,
    end: NOW + 7200,
    te_sgp_config: config
  });
  // Made public before it started: it keeps its committee and may turn private again.
  await insertProposal({
    id: PENDING_PUBLIC,
    privacy: '',
    start: NOW + 3600,
    end: NOW + 7200,
    te_sgp_config: config
  });
  await insertProposal({
    id: ACTIVE,
    privacy: 'shutter-elgamal',
    start: NOW - 60,
    end: NOW + 3600,
    te_sgp_config: config
  });
});

afterAll(async () => {
  await db.queryAsync('DELETE FROM proposals WHERE id IN (?)', [
    [PENDING, PENDING_PUBLIC, ACTIVE]
  ]);
  delete process.env.TE_ELIGIBILITY_PRIVATE_KEY;
  resetIssuer();
  await db.endAsync();
  await sequencerDB.endAsync();
});

describe('refreezeEligibilityKey', () => {
  it('moves only the proposals that have not started, and keeps the rest of the committee', async () => {
    const current = (await getEligibilityKey()).toLowerCase();

    expect(await refreezeEligibilityKey(NOW)).toBe(2);
    expect(await frozenKey(PENDING)).toEqual({ key: current, t: 2 });
    expect(await frozenKey(PENDING_PUBLIC)).toEqual({ key: current, t: 2 });
    expect(await frozenKey(ACTIVE)).toEqual({ key: OLD_KEY, t: 2 });

    // A second boot with the same key changes nothing.
    expect(await refreezeEligibilityKey(NOW)).toBe(0);
  });

  // At startup, before the private-voting migration has run: the column is
  // missing. The sequencer must still start, so the step reports and moves on.
  it('logs a database error and moves nothing, instead of stopping startup', async () => {
    jest
      .spyOn(db, 'queryAsync')
      .mockRejectedValueOnce(new Error("Unknown column 'te_sgp_config'"));
    await expect(refreezeEligibilityKey(NOW)).resolves.toBe(0);
  });
});
