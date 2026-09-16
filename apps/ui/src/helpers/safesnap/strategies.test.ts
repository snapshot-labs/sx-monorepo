import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSafeSnapStrategies } from './strategies';

const MODULE = '0x0d70332CEB7F3C94b061cda48327891E3449A9E1';
const SAFE = '0xC2339fcbB6481C2Dc1f509b7A8cD7CE815f8FEC2';
const UMA = '0x8aC054dC93Cd512e1f79F1B3cd732662980C2810';

vi.mock('@/helpers/provider', () => ({
  getProvider: () => ({ _isProvider: true })
}));

// Every on-chain read goes through a Contract, so stub that rather than faking
// ABI-encoded responses per selector: avatar()/executor() resolve the module's
// Safe, rules() decides whether v1 would route the entry to UMA.
const { avatarMock, executorMock, rulesMock } = vi.hoisted(() => ({
  avatarMock: vi.fn(),
  executorMock: vi.fn(),
  rulesMock: vi.fn()
}));

vi.mock('@ethersproject/contracts', () => ({
  Contract: vi.fn(() => ({
    avatar: avatarMock,
    executor: executorMock,
    rules: rulesMock
  }))
}));

beforeEach(() => {
  avatarMock.mockReset().mockResolvedValue(SAFE);
  executorMock.mockReset().mockRejectedValue(new Error('no executor()'));
  // Default: not a UMA module, which is what a reverting rules() looks like.
  rulesMock.mockReset().mockRejectedValue(new Error('execution reverted'));
});

// The rejection cases return [] before any on-chain resolution; the accepted
// ones resolve their Safe through the mocked Contract above.
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

  it('rejects an entry whose UMA module answers rules()', async () => {
    // v1 routes this entry's proposals to UMA, which sx cannot author.
    rulesMock.mockResolvedValue('I assert that this proposal is valid…');

    const result = await getSafeSnapStrategies(
      space({
        safes: [{ network: '137', realityAddress: MODULE, umaAddress: UMA }]
      })
    );

    expect(result).toEqual([]);
  });

  it('keeps an entry whose UMA address is not a live UMA module', async () => {
    // rules() reverts, so v1 falls back to Reality and sx is right to offer it.
    const result = await getSafeSnapStrategies(
      space({
        safes: [{ network: '137', realityAddress: MODULE, umaAddress: UMA }]
      })
    );

    expect(result).toHaveLength(1);
    expect(result[0].treasury.address).toBe(SAFE);
  });

  it('keeps an entry when the UMA probe cannot complete', async () => {
    // A transport failure is indistinguishable from a revert in ethers, so it
    // must not withhold a Reality module we would otherwise offer.
    rulesMock.mockRejectedValue(
      Object.assign(new Error('missing response'), { code: 'SERVER_ERROR' })
    );

    const result = await getSafeSnapStrategies(
      space({
        safes: [{ network: '137', realityAddress: MODULE, umaAddress: UMA }]
      })
    );

    expect(result).toHaveLength(1);
  });

  it.each([
    ['a placeholder', '0xSWITCH_WITH_UMA_MODULE_ADDRESS'],
    ['empty', ''],
    ['absent', undefined]
  ])('keeps an entry whose umaAddress is %s', async (_label, umaAddress) => {
    // Not an address, so v1's own isAddress check fails and no probe is made.
    const result = await getSafeSnapStrategies(
      space({
        safes: [{ network: '137', realityAddress: MODULE, umaAddress }]
      })
    );

    expect(result).toHaveLength(1);
    expect(result[0].treasury.address).toBe(SAFE);
    expect(rulesMock).not.toHaveBeenCalled();
  });

  it('resolves the treasury through executor() when avatar() fails', async () => {
    avatarMock.mockRejectedValue(new Error('no avatar()'));
    executorMock.mockResolvedValue(SAFE);

    const result = await getSafeSnapStrategies(
      space({ safes: [{ network: '137', realityAddress: MODULE }] })
    );

    expect(result[0].treasury.address).toBe(SAFE);
  });

  it('drops the module when neither avatar() nor executor() resolves', async () => {
    avatarMock.mockRejectedValue(new Error('no avatar()'));

    const result = await getSafeSnapStrategies(
      space({ safes: [{ network: '137', realityAddress: MODULE }] })
    );

    expect(result).toEqual([]);
  });

  it('drops nullish elements instead of throwing', async () => {
    const result = await getSafeSnapStrategies(
      space({ safes: [null, undefined] })
    );

    expect(result).toEqual([]);
  });

  it('rejects a legacy top-level address that is not an address', async () => {
    const result = await getSafeSnapStrategies(
      space({ address: '0xSWITCH_WITH_REALITY_MODULE_ADDRESS' })
    );

    expect(result).toEqual([]);
  });

  it('falls back to the space network, not chain 1, when a safe omits network', async () => {
    const result = await getSafeSnapStrategies(
      space({ safes: [{ realityAddress: MODULE }] }, '137')
    );

    expect(result[0].treasury.chainId).toBe('137');
  });
});
