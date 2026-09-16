import {
  resolveVotingPowerBound,
  VotingPowerBoundError
} from '../../../src/helpers/teVotingPowerBound';

/**
 * `V` decides the scale a tally counts in. Over-estimating costs a little precision;
 * under-estimating leaves the tally beyond what the coordinator was sized for, and
 * nothing downstream detects that. These tests are almost entirely about never
 * resolving low.
 */

const supplies: Record<string, string> = {};
let calls: string[] = [];
let failuresLeft = 0;

jest.mock('../../../src/helpers/provider', () => ({
  getProvider: () => ({ __mock: true })
}));

jest.mock('@ethersproject/contracts', () => ({
  Contract: class {
    constructor(public address: string) {}
    async totalSupply() {
      calls.push(this.address.toLowerCase());
      if (failuresLeft > 0) {
        failuresLeft--;
        throw new Error('rpc down');
      }
      const v = supplies[this.address.toLowerCase()];
      if (v === undefined)
        throw new Error(`no supply stubbed for ${this.address}`);
      return { toString: () => v };
    }
  }
}));

const TOKEN_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const TOKEN_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

const base = {
  proposalNetwork: '1',
  snapshotBlock: 12345,
  fallbackValue: 1e12
};

beforeEach(() => {
  calls = [];
  failuresLeft = 0;
  supplies[TOKEN_A] = (10n ** 24n).toString(); // 1e24 wei = 1e6 tokens at 18dp
  supplies[TOKEN_B] = (10n ** 21n).toString(); // 1e21 wei = 1e3 tokens at 18dp
});

describe('resolveVotingPowerBound', () => {
  it('normalises an erc20 supply by decimals', async () => {
    const r = await resolveVotingPowerBound({
      ...base,
      strategies: [
        { name: 'erc20-balance-of', params: { address: TOKEN_A, decimals: 18 } }
      ]
    });
    expect(r).toEqual({ value: 1e6, source: 'strategies' });
  });

  it('sums across strategies, because voting power is a sum', async () => {
    const r = await resolveVotingPowerBound({
      ...base,
      strategies: [
        {
          name: 'erc20-balance-of',
          params: { address: TOKEN_A, decimals: 18 }
        },
        { name: 'erc20-votes', params: { address: TOKEN_B, decimals: 18 } }
      ]
    });
    expect(r.value).toBe(1e6 + 1e3);
    expect(r.source).toBe('strategies');
  });

  it('reads each distinct token once', async () => {
    await resolveVotingPowerBound({
      ...base,
      strategies: [
        {
          name: 'erc20-balance-of',
          params: { address: TOKEN_A, decimals: 18 }
        },
        { name: 'erc20-votes', params: { address: TOKEN_A, decimals: 18 } }
      ]
    });
    expect(calls).toHaveLength(1);
  });

  it('does not scale an erc721 supply by decimals', async () => {
    supplies[TOKEN_A] = '5000';
    const r = await resolveVotingPowerBound({
      ...base,
      strategies: [{ name: 'erc721', params: { address: TOKEN_A } }]
    });
    expect(r.value).toBe(5000);
  });

  it('falls back for the WHOLE proposal when any strategy is unrecognised', async () => {
    // Summing only the recognised one would hand back an under-estimate dressed as a
    // bound — the precise failure V exists to prevent.
    const r = await resolveVotingPowerBound({
      ...base,
      strategies: [
        {
          name: 'erc20-balance-of',
          params: { address: TOKEN_A, decimals: 18 }
        },
        { name: 'whitelist', params: {} }
      ]
    });
    expect(r).toEqual({
      value: 1e12,
      source: 'fallback',
      unrecognised: 'whitelist'
    });
    expect(calls).toHaveLength(0);
  });

  it('treats a recognised strategy with no address as unrecognised', async () => {
    const r = await resolveVotingPowerBound({
      ...base,
      strategies: [{ name: 'erc20-balance-of', params: { decimals: 18 } }]
    });
    expect(r.source).toBe('fallback');
  });

  it('falls back when a proposal lists no strategies at all', async () => {
    const r = await resolveVotingPowerBound({ ...base, strategies: [] });
    expect(r.source).toBe('fallback');
  });

  it('retries a failing read and succeeds', async () => {
    failuresLeft = 2;
    const r = await resolveVotingPowerBound({
      ...base,
      attempts: 3,
      strategies: [
        { name: 'erc20-balance-of', params: { address: TOKEN_A, decimals: 18 } }
      ]
    });
    expect(r.value).toBe(1e6);
    expect(calls).toHaveLength(3);
  });

  it('throws rather than guessing when every attempt fails', async () => {
    // Refusing is affordable precisely because V is deterministic: the snapshot
    // block is frozen, so a later retry returns the identical number.
    failuresLeft = 99;
    await expect(
      resolveVotingPowerBound({
        ...base,
        attempts: 3,
        strategies: [
          {
            name: 'erc20-balance-of',
            params: { address: TOKEN_A, decimals: 18 }
          }
        ]
      })
    ).rejects.toBeInstanceOf(VotingPowerBoundError);
  });

  it('does not fall back on an RPC failure — that would size from a guess', async () => {
    failuresLeft = 99;
    await expect(
      resolveVotingPowerBound({
        ...base,
        attempts: 1,
        strategies: [
          {
            name: 'erc20-balance-of',
            params: { address: TOKEN_A, decimals: 18 }
          }
        ]
      })
    ).rejects.toThrow(/refused rather than sized from a guess/);
  });
});

/**
 * Raw `totalSupply()` past 2^53.
 *
 * `readSupply` does `Number(raw.toString()) / 10 ** decimals`. A token with 18
 * decimals crosses 2^53 in *raw* units at only ~0.009 whole tokens, and one with 6
 * decimals at ~9e9 — well inside the range where `V` starts to matter, since
 * scaling begins above 1e10 whole tokens at budget 100. So the lossy conversion is
 * not a theoretical edge: any token big enough to need scaling is big enough to
 * lose raw precision.
 *
 * That is a deliberate trade (`V` is a conservative bound feeding a power-of-two
 * `s`, so parts-per-quadrillion are irrelevant), and these tests pin the two things
 * that actually have to hold: the whole-token value stays accurate enough that the
 * derived `s` is unchanged, and nothing overflows to `Infinity` or `NaN` — either
 * of which would silently poison every downstream comparison rather than throw.
 */
describe('readSupply precision past 2^53', () => {
  const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER); // 9_007_199_254_740_991

  async function boundFor(rawUnits: bigint, decimals: number) {
    supplies[TOKEN_A] = rawUnits.toString();
    calls = [];
    return resolveVotingPowerBound({
      ...base,
      strategies: [
        { name: 'erc20-balance-of', params: { address: TOKEN_A, decimals } }
      ]
    });
  }

  it('reads a 6-decimal supply whose raw value exceeds 2^53', async () => {
    // 1e12 whole tokens -> 1e18 raw. Comfortably past 2^53, and the supply that
    // puts a 1e12-ceiling deployment at s = 128.
    const whole = 1_000_000_000_000n;
    const raw = whole * 10n ** 6n;
    expect(raw).toBeGreaterThan(MAX_SAFE);

    const r = await boundFor(raw, 6);
    expect(r.source).toBe('strategies');
    expect(Number.isFinite(r.value)).toBe(true);
    expect(r.value).toBe(1e12);
  });

  it('reads an 18-decimal supply, where raw units are astronomically past 2^53', async () => {
    // 1e9 whole tokens at 18 decimals -> 1e27 raw. This is the common ERC-20 shape.
    const whole = 1_000_000_000n;
    const raw = whole * 10n ** 18n;
    const r = await boundFor(raw, 18);
    expect(Number.isFinite(r.value)).toBe(true);
    expect(r.value).toBe(1e9);
  });

  it('does not overflow to Infinity at an absurd supply', async () => {
    // uint256 max. A float can hold ~1.8e308, so this must stay finite rather than
    // becoming Infinity — which would compare as "larger than every bound" and
    // quietly disable the H9 alarm instead of failing.
    const raw = 2n ** 256n - 1n;
    const r = await boundFor(raw, 18);
    expect(Number.isFinite(r.value)).toBe(true);
    expect(Number.isNaN(r.value)).toBe(false);
    expect(r.value).toBeGreaterThan(0);
  });

  // The property that actually matters: the lossy conversion must not move `s`.
  // `s` is a power of two derived from `V`, so a relative error of ~1e-16 can only
  // change it if `V` sits within that fraction of a doubling boundary — which the
  // conservative direction of the bound already tolerates.
  it('loses no precision that could change the derived scale', async () => {
    const { deriveScale } = await import('../../../src/helpers/teCommittee');
    const budget = 100;
    const ceiling = 1e12;
    for (const whole of [
      6_500_000_000_000n, // inside the s=128 window
      1_000_000_000_000n,
      20_000_000_000n,
      10_000_000_001n
    ]) {
      const r = await boundFor(whole * 10n ** 6n, 6);
      // Exact scale, computed from the integer the float approximates.
      const exact = deriveScale(budget, Number(whole), ceiling);
      expect(deriveScale(budget, r.value, ceiling)).toBe(exact);
    }
  });

  it('a supply that fits in 2^53 is still exact', async () => {
    // Regression guard on the ordinary case: the live USDC token, raw 1.011123e12.
    const r = await boundFor(1_011_123_000_000n, 6);
    expect(r.value).toBe(1_011_123);
  });
});
