import { describe, expect, it } from 'vitest';
import { getSafeSnapStrategies } from './strategies';

const MODULE = '0x0d70332CEB7F3C94b061cda48327891E3449A9E1';

// These cases all reject the config before any on-chain resolution, so they
// return [] without touching the network — no provider mock needed. The happy
// path (a valid module resolving via avatar()) is covered by the manual test
// plan, since it requires a live chain call.
function space(safeSnap: unknown, snapshotChainId = '1') {
  return {
    snapshot_chain_id: snapshotChainId,
    additionalRawData: { plugins: { safeSnap } }
  } as any;
}

describe('getSafeSnapStrategies', () => {
  it('returns [] when the space has no safeSnap config', async () => {
    const noPlugins = { additionalRawData: { plugins: {} } } as any;

    expect(await getSafeSnapStrategies(noPlugins)).toEqual([]);
  });

  it('rejects the unedited plugin template placeholder', async () => {
    const result = await getSafeSnapStrategies(
      space({
        safes: [
          {
            network: 'CHAIN_ID',
            realityAddress: '0xSWITCH_WITH_REALITY_MODULE_ADDRESS'
          }
        ]
      })
    );

    expect(result).toEqual([]);
  });

  it('rejects a valid address paired with a non-numeric network', async () => {
    const result = await getSafeSnapStrategies(
      space({ safes: [{ network: 'CHAIN_ID', realityAddress: MODULE }] })
    );

    expect(result).toEqual([]);
  });

  it('rejects a numeric network paired with a placeholder address', async () => {
    const result = await getSafeSnapStrategies(
      space({
        safes: [
          { network: '137', realityAddress: '0xSWITCH_WITH_REALITY_MODULE' }
        ]
      })
    );

    expect(result).toEqual([]);
  });

  it('treats a non-array safes as absent instead of throwing', async () => {
    expect(await getSafeSnapStrategies(space({ safes: 'nope' }))).toEqual([]);
    expect(await getSafeSnapStrategies(space('rawstring'))).toEqual([]);
  });

  it('rejects a legacy top-level address that is not an address', async () => {
    const result = await getSafeSnapStrategies(
      space({ address: '0xSWITCH_WITH_REALITY_MODULE_ADDRESS' })
    );

    expect(result).toEqual([]);
  });
});
