import { describe, expect, it } from 'vitest';
import { getHealthReport } from './health';

describe('getHealthReport', () => {
  const reader = (rows: { indexer: string; value: string }[]) => async () =>
    rows;

  it('reports healthy when lag is within threshold', async () => {
    const report = await getHealthReport(
      reader([{ indexer: 'sn', value: '1000' }]),
      { sn: async () => 1050 }
    );

    expect(report.healthy).toBe(true);
    expect(report.indexers[0]).toMatchObject({
      indexer: 'sn',
      indexedBlock: 1000,
      chainHead: 1050,
      lag: 50,
      healthy: true
    });
  });

  it('reports unhealthy when lag exceeds threshold', async () => {
    const report = await getHealthReport(
      reader([{ indexer: 'sn', value: '1000' }]),
      { sn: async () => 20000 }
    );

    expect(report.healthy).toBe(false);
    expect(report.indexers[0]).toMatchObject({ lag: 19000, healthy: false });
  });

  it('reports unhealthy when chain head cannot be fetched', async () => {
    const report = await getHealthReport(
      reader([{ indexer: 'sn', value: '1000' }]),
      {
        sn: async () => {
          throw new Error('rpc down');
        }
      }
    );

    expect(report.healthy).toBe(false);
    expect(report.indexers[0]).toMatchObject({
      chainHead: null,
      lag: null,
      healthy: false,
      error: 'failed to fetch chain head'
    });
  });

  it('handles a monitored indexer with no indexed block yet', async () => {
    const report = await getHealthReport(reader([]), { sn: async () => 30 });

    expect(report.indexers[0]).toMatchObject({
      indexer: 'sn',
      indexedBlock: null,
      chainHead: 30,
      lag: 30
    });
  });
});
