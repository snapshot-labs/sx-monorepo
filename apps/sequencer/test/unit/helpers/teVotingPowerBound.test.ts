import {
  resolveVotingPowerBound,
  VotingPowerBoundError
} from '../../../src/helpers/teVotingPowerBound';

/**
 * `V` sets the scale a tally counts in. Too high costs a little precision; too low
 * can produce a tally larger than the coordinator can solve, and nothing later
 * detects it. So most of these tests check that `V` never resolves low.
 */

const supplies: Record<string, string> = {};
let calls: string[] = [];
let blockTags: Record<string, unknown> = {};
let failuresLeft = 0;

// The block on each chain at the moment of the proposal's snapshot block.
const BLOCKS_BY_NETWORK: Record<string, number> = { '42161': 300000000 };

jest.mock('../../../src/helpers/provider', () => ({
  getProvider: () => ({ __mock: true })
}));

jest.mock('@snapshot-labs/snapshot.js', () => {
  const originalModule = jest.requireActual('@snapshot-labs/snapshot.js');

  return {
    ...originalModule,
    utils: {
      ...originalModule.utils,
      getSnapshots: async (
        network: string,
        block: number,
        _provider: unknown,
        networks: string[]
      ) =>
        Object.fromEntries(
          networks.map(n => [n, n === network ? block : BLOCKS_BY_NETWORK[n]])
        ),
      call: async (
        _provider: unknown,
        _abi: unknown,
        [address]: string[],
        options: { blockTag: unknown }
      ) => {
        calls.push(address.toLowerCase());
        blockTags[address.toLowerCase()] = options.blockTag;
        if (failuresLeft > 0) {
          failuresLeft--;
          throw new Error('rpc down');
        }
        const v = supplies[address.toLowerCase()];
        if (v === undefined) {
          throw new Error(`no supply stubbed for ${address}`);
        }
        return { toString: () => v };
      }
    }
  };
});

const TOKEN_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const TOKEN_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

const base = {
  proposalNetwork: '1',
  snapshotBlock: 12345,
  fallbackValue: 1e12
};

beforeEach(() => {
  calls = [];
  blockTags = {};
  failuresLeft = 0;
  supplies[TOKEN_A] = (10n ** 24n).toString(); // 1e24 wei = 1e6 tokens at 18dp
  supplies[TOKEN_B] = (10n ** 21n).toString(); // 1e21 wei = 1e3 tokens at 18dp
});

const erc20 = (address = TOKEN_A, decimals = 18) => ({
  name: 'erc20-balance-of',
  params: { address, decimals }
});

describe('resolveVotingPowerBound', () => {
  // A wrong decimals scaling would set `V` far too low. The uint256-max row must
  // stay finite: Infinity would silently disable the ingest weight alarm.
  it.each([
    ['an erc20 supply by decimals', erc20(), (10n ** 24n).toString(), 1e6],
    [
      'an erc721 supply without decimals',
      { name: 'erc721', params: { address: TOKEN_A } },
      '5000',
      5000
    ],
    [
      'a uint256-max erc20 supply to a finite value',
      erc20(),
      (2n ** 256n - 1n).toString(),
      Number(2n ** 256n - 1n) / 1e18
    ]
  ])('normalises %s', async (_label, strategy, supply, expected) => {
    supplies[TOKEN_A] = supply;
    const r = await resolveVotingPowerBound({
      ...base,
      strategies: [strategy]
    });
    expect(r).toEqual({ value: expected, source: 'strategies' });
    expect(Number.isFinite(r.value)).toBe(true);
  });

  // Voting power is a sum over strategies. A token used twice is still read once.
  it('sums across strategies, reading each distinct token once', async () => {
    const r = await resolveVotingPowerBound({
      ...base,
      strategies: [
        erc20(),
        { name: 'erc20-votes', params: { address: TOKEN_A, decimals: 18 } },
        { name: 'erc20-votes', params: { address: TOKEN_B, decimals: 18 } }
      ]
    });
    expect(r.value).toBe(2e6 + 1e3);
    expect(r.source).toBe('strategies');
    expect(calls).toHaveLength(2);
  });

  // Block numbers differ per chain: Arbitrum's are far ahead of mainnet's. Reading
  // a token on another chain at the proposal chain's block number asks for a block
  // that does not exist yet, or one from years ago.
  it("reads a token on another chain at that chain's block", async () => {
    await resolveVotingPowerBound({
      ...base,
      strategies: [erc20(), { ...erc20(TOKEN_B), network: '42161' }]
    });
    expect(blockTags).toEqual({
      [TOKEN_A]: base.snapshotBlock,
      [TOKEN_B]: BLOCKS_BY_NETWORK['42161']
    });
  });

  // The supply alone would be an under-estimate, since the whitelist adds power.
  it.each([
    [
      'keeps the fallback when the supply is below it',
      (10n ** 24n).toString(),
      1e12
    ],
    [
      'takes the supply when it is past the fallback',
      (10n ** 31n).toString(),
      1e13
    ]
  ])('on a mixed space, %s', async (_label, supply, expected) => {
    supplies[TOKEN_A] = supply;
    const r = await resolveVotingPowerBound({
      ...base,
      strategies: [erc20(), { name: 'whitelist', params: {} }]
    });
    expect(r).toEqual({
      value: expected,
      source: 'mixed',
      unrecognised: 'whitelist'
    });
  });

  it.each([
    [
      'a recognised strategy with no address',
      [{ name: 'erc20-balance-of', params: { decimals: 18 } }]
    ],
    ['no strategies at all', []]
  ])('falls back on %s', async (_label, strategies) => {
    const r = await resolveVotingPowerBound({ ...base, strategies });
    expect(r.source).toBe('fallback');
  });

  it('retries a failing read and succeeds', async () => {
    failuresLeft = 2;
    const r = await resolveVotingPowerBound({
      ...base,
      attempts: 3,
      strategies: [erc20()]
    });
    expect(r.value).toBe(1e6);
    expect(calls).toHaveLength(3);
  });

  // Throwing is safe because the snapshot block is fixed, so a later retry
  // returns the same number. Falling back would size from a guess.
  it.each([[1], [3]])(
    'throws rather than falling back when all %p attempts fail',
    async attempts => {
      failuresLeft = 99;
      const result = resolveVotingPowerBound({
        ...base,
        attempts,
        strategies: [erc20()]
      });
      await expect(result).rejects.toBeInstanceOf(VotingPowerBoundError);
      await expect(result).rejects.toThrow(
        /refused rather than sized from a guess/
      );
    }
  );
});
