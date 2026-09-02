import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildUsage, formatUsd } from './index';

describe('buildUsage', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-25T12:00:00Z'));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('zero-fills every bucket when there are no rows', () => {
    const daily = buildUsage([], 30, 'day');
    const monthly = buildUsage([], 12, 'month');

    expect(daily).toHaveLength(30);
    expect(monthly).toHaveLength(12);
    expect(daily.every(bucket => bucket.hub === 0 && bucket.score === 0)).toBe(
      true
    );
    expect(daily.at(-1)?.label).toBe('Aug 25');
    expect(monthly.at(-1)?.label).toBe('Aug');
  });

  it('sums rows sharing a period, as returned for multiple keys', () => {
    const buckets = buildUsage(
      [
        { app: 'snapshot-hub', period: '25-08-2026', total: 2 },
        { app: 'snapshot-hub', period: '25-08-2026', total: 3 },
        { app: 'score-api', period: '25-08-2026', total: 7 }
      ],
      30,
      'day'
    );

    expect(buckets.at(-1)).toMatchObject({ hub: 5, score: 7 });
  });

  it('ignores unknown apps and periods outside the window', () => {
    const buckets = buildUsage(
      [
        { app: 'other-api', period: '25-08-2026', total: 100 },
        { app: 'snapshot-hub', period: '01-01-2020', total: 100 }
      ],
      30,
      'day'
    );

    expect(
      buckets.every(bucket => bucket.hub === 0 && bucket.score === 0)
    ).toBe(true);
  });

  it('matches the API period strings for both units', () => {
    const daily = buildUsage(
      [{ app: 'snapshot-hub', period: '27-07-2026', total: 4 }],
      30,
      'day'
    );
    const monthly = buildUsage(
      [{ app: 'score-api', period: '09-2025', total: 9 }],
      12,
      'month'
    );

    expect(daily[0]).toMatchObject({ label: 'Jul 27', hub: 4 });
    expect(monthly[0]).toMatchObject({ label: 'Sep', score: 9 });
  });
});

describe('formatUsd', () => {
  it('should format amounts with two decimals and grouping', () => {
    expect(formatUsd(0)).toBe('$0.00');
    expect(formatUsd(0.01)).toBe('$0.01');
    expect(formatUsd(1234.5)).toBe('$1,234.50');
  });

  it('should mark sub-cent amounts with a tilde', () => {
    expect(formatUsd(0.0019)).toBe('~$0.00');
    expect(formatUsd(0.0099)).toBe('~$0.00');
  });
});
