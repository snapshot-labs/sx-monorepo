import fetch from 'node-fetch';
import {
  ballotParamsColumn,
  buildCommitteeSnapshot,
  clearCommitteeCache,
  committeeColumns,
  DEFAULT_TE_SOLVER_CEILING,
  deriveScale,
  frozenWeightedBudget,
  getPrivateBallotError,
  parseKeypers,
  resolveCommittee,
  TeConfigError,
  TeEnv,
  teSolverCeiling,
  votingPowerFallback,
  weightedBudgetFromEnv
} from '../../../src/helpers/teCommittee';

jest.mock('node-fetch', () => jest.fn());
const mockFetch = fetch as unknown as jest.Mock;

/** Make every keyper URL report the address mapped to it. */
function statusReturns(byUrl: Record<string, string | Error>) {
  mockFetch.mockImplementation(async (target: string) => {
    const url = String(target).replace(/\/status$/, '');
    const value = byUrl[url];
    if (value === undefined) throw new Error(`ECONNREFUSED ${url}`);
    if (value instanceof Error) throw value;
    return { ok: true, status: 200, json: async () => ({ address: value }) };
  });
}

// A real 48-byte compressed G1 point, taken from the protocol's attestation
// test vectors, so the shape check runs against a genuine key.
const ELIGIBILITY_KEY =
  '0x972a59075fca0729b40b2cea5bb9685afdd219e77407e13631664c53b847cdcad45ab174a073aaa4122ad813fa094485';

const K1 = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
const K2 = '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359';
const K3 = '0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB';
// All addresses here are in EIP-55 checksum form.
const ADMIN = '0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb';

function env(overrides: Partial<TeEnv> = {}): TeEnv {
  return {
    keypers:
      'https://k1.example.com,https://k2.example.com,https://k3.example.com',
    thresholdT: '2',
    weightedBudget: '100',
    resultPublisherAddress: ADMIN,
    ...overrides
  };
}

const window = { votingStart: 1_770_000_000, votingEnd: 1_770_086_400 };

type BuildArgs = Partial<Parameters<typeof buildCommitteeSnapshot>[0]>;

function build(overrides: Partial<TeEnv> = {}, args: BuildArgs = {}) {
  return buildCommitteeSnapshot({
    maxTotalWeight: 1e6,
    env: env(overrides),
    eligibilityKey: ELIGIBILITY_KEY,
    // Only recorded in the config. The hub checks the space's current admins.
    adminAddress: ADMIN,
    ...window,
    ...args
  });
}

const savedEnv = { ...process.env };
afterEach(() => {
  process.env = { ...savedEnv };
});

beforeEach(() => {
  clearCommitteeCache();
  mockFetch.mockReset();
  statusReturns({
    'https://k1.example.com': K1,
    'https://k2.example.com': K2,
    'https://k3.example.com': K3,
    'https://k.example.com': K1
  });
});

describe('parseKeypers', () => {
  it.each([
    [
      'strips trailing slashes',
      'https://k1.example.com/,https://k2.example.com',
      [{ url: 'https://k1.example.com' }, { url: 'https://k2.example.com' }]
    ],
    ['reads unset as no committee', undefined, []],
    ['reads blank as no committee', '   ', []],
    [
      'tolerates whitespace and trailing separators',
      ' https://k1.example.com , ',
      [{ url: 'https://k1.example.com' }]
    ]
  ])('%s', (_label, raw, expected) => {
    expect(parseKeypers(raw)).toEqual(expected);
  });

  // The old address@url format gets its own error message, since a generic
  // "must be a URL" would confuse whoever wrote it.
  it.each([
    [
      'the old address@url form',
      `${K1}@https://k1.example.com`,
      /takes URLs only/
    ],
    ['a bare address', `${K1}`, /http\(s\) URL/],
    ['a host with no scheme', 'k1.example.com', /http\(s\) URL/],
    ['an empty scheme', '://k1.example.com', /http\(s\) URL/]
  ])('rejects %s', (_label, raw, message) => {
    expect(() => parseKeypers(raw)).toThrow(TeConfigError);
    expect(() => parseKeypers(raw)).toThrow(message);
  });
});

describe('buildCommitteeSnapshot', () => {
  it('freezes the committee, roles, window and budget', async () => {
    await expect(build()).resolves.toEqual({
      v: 1,
      keypers: [
        { address: K1, url: 'https://k1.example.com' },
        { address: K2, url: 'https://k2.example.com' },
        { address: K3, url: 'https://k3.example.com' }
      ],
      thresholdT: 2,
      thresholdN: 3,
      eligibilityKey: ELIGIBILITY_KEY.toLowerCase(),
      resultPublisherAddress: ADMIN,
      adminAddress: ADMIN,
      votingStart: window.votingStart,
      votingEnd: window.votingEnd,
      weightedBudget: 100,
      // Frozen with the committee because the scale `s` is derived from this pair.
      maxTotalWeight: 1e6,
      solverCeiling: DEFAULT_TE_SOLVER_CEILING
    });
  });

  it('derives n from the committee, accepting one keyper at t = 1', async () => {
    const snapshot = await build({
      keypers: 'https://k1.example.com',
      thresholdT: '1'
    });
    expect(snapshot.thresholdT).toBe(1);
    expect(snapshot.thresholdN).toBe(1);
    expect(snapshot.keypers).toHaveLength(1);
  });

  it('defaults the threshold and the weighted budget', async () => {
    const snapshot = await build({
      thresholdT: undefined,
      weightedBudget: undefined
    });
    expect(snapshot.thresholdT).toBe(2);
    expect(snapshot.weightedBudget).toBe(100);
  });

  // These configs give a key ceremony that can never finish, or a quorum that
  // means nothing, so they must fail at creation, where the author sees the error.
  // A minority quorum cannot decide agreement: with t = 1 of 3, two keypers could
  // each publish a different result and both would meet the quorum.
  it.each([
    ['a quorum larger than n (4)', { thresholdT: '4' }, /1 <= t <= n/],
    ['a quorum larger than n (9)', { thresholdT: '9' }, /1 <= t <= n/],
    ['a quorum of zero', { thresholdT: '0' }, /1 <= t <= n/],
    ['a negative quorum', { thresholdT: '-1' }, /1 <= t <= n/],
    [
      'a quorum that is not a majority',
      { thresholdT: '1' },
      /not a majority.*use t >= 2/
    ],
    ['a non-integer threshold', { thresholdT: '1.5' }, /must be an integer/],
    ['an unconfigured committee', { keypers: undefined }, /TE_KEYPERS/],
    [
      'a missing result publisher',
      { resultPublisherAddress: undefined },
      /TE_RESULT_PUBLISHER_ADDRESS/
    ],
    [
      'a non-address role key',
      { resultPublisherAddress: 'not-an-address' },
      /not an address/
    ],
    // A budget below 1 would make every split zero.
    ['a weighted budget below 1', { weightedBudget: '0' }, />= 1/],
    [
      'a malformed eligibility key',
      {},
      /compressed G1/,
      { eligibilityKey: '0xdeadbeef' }
    ],
    [
      'a window that ends before it starts',
      {},
      /must be after/,
      { votingStart: 200, votingEnd: 100 }
    ],
    [
      'a window that ends when it starts',
      {},
      /must be after/,
      { votingStart: 100, votingEnd: 100 }
    ]
  ] as [string, Partial<TeEnv>, RegExp, BuildArgs?][])(
    'rejects %s',
    async (_label, envOverride, message, args = {}) => {
      await expect(build(envOverride, args)).rejects.toThrow(message);
    }
  );

  // Two URLs with the same key are one operator, who could meet a quorum of 2
  // alone. Detected from the resolved addresses.
  it('rejects a duplicated keyper, which would inflate n past the real committee', async () => {
    statusReturns({
      'https://a.example.com': K1,
      'https://b.example.com': K1
    });
    await expect(
      build({
        keypers: 'https://a.example.com,https://b.example.com'
      })
    ).rejects.toThrow(/same keyper/);
  });
});

describe('resolveCommittee', () => {
  // The sequencer implements EIP-55 itself, so it is checked against the vectors
  // from the EIP. A wrong checksum would make the hub reject every keyper write as
  // "not a registered keyper".
  it.each([
    ['0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed', K1],
    ['0xfb6916095ca1df60bb79ce92ce3ea74c37c5d359', K2],
    ['0xdbf03b407c01e7cd3cbea99509d93f8dddc8c6fb', K3]
  ])('checksums a resolved %s to EIP-55', async (reported, expected) => {
    statusReturns({ 'https://k.example.com': reported });
    const [k] = await resolveCommittee(
      parseKeypers('https://k.example.com'),
      `solo-${reported}`
    );
    expect(k.address).toBe(expected);
  });

  // Addresses are resolved once per process and cached, not once per proposal.
  it('resolves once, and again only when the committee changes', async () => {
    await build();
    expect(mockFetch.mock.calls.length).toBe(3);
    await build();
    expect(mockFetch.mock.calls.length).toBe(3);
    await build({
      keypers: 'https://k1.example.com,https://k2.example.com',
      thresholdT: '2'
    });
    expect(mockFetch.mock.calls.length).toBeGreaterThan(3);
  });

  // The DKG needs every member, so an unreachable keyper must fail creation.
  // Otherwise the proposal would fail later at voting_start, with no way to fix it.
  it.each([
    [
      'an unreachable keyper, by name',
      () =>
        statusReturns({
          'https://k1.example.com': K1,
          'https://k2.example.com': new Error('socket hang up'),
          'https://k3.example.com': K3
        }),
      /cannot resolve keyper at https:\/\/k2\.example\.com/
    ],
    [
      'a /status that is not an address',
      () =>
        mockFetch.mockImplementation(async () => ({
          ok: true,
          status: 200,
          json: async () => ({ address: 'nonsense' })
        })),
      /valid address/
    ],
    [
      'a non-200 /status',
      () =>
        mockFetch.mockImplementation(async () => ({ ok: false, status: 503 })),
      /HTTP 503/
    ]
  ])('rejects %s', async (_label, setup, message) => {
    setup();
    await expect(build()).rejects.toThrow(message);
  });
});

describe('committeeColumns', () => {
  it('denormalises the committee for readers that already exist', async () => {
    const snapshot = await build();
    const columns = committeeColumns(snapshot);

    // Copied out of te_sgp_config for older readers: the UI's "2-of-3" label and
    // the tally's share-count check read these columns.
    expect(columns.te_threshold_t).toBe(2);
    expect(columns.te_threshold_n).toBe(3);
    // Checksummed, because the hub compares against getAddress() output.
    expect(JSON.parse(columns.te_keyper_addresses)).toEqual([K1, K2, K3]);
    // The snapshot is the source of truth; the columns above are copies.
    expect(JSON.parse(columns.te_sgp_config)).toEqual(snapshot);
  });
});

describe('frozenWeightedBudget', () => {
  const snapshot = (weightedBudget: unknown) =>
    JSON.stringify({ v: 1, weightedBudget, eligibilityKey: '0x00' });

  it.each([
    ['a JSON string', snapshot(100), 100],
    ['an already-parsed object', { weightedBudget: 50 }, 50]
  ])('reads the frozen budget from %s', (_label, stored, expected) => {
    expect(frozenWeightedBudget(stored)).toBe(expected);
  });

  // It throws instead of falling back to the env value, which this function
  // exists to avoid.
  it.each([
    ['missing', snapshot(undefined)],
    ['not a number', snapshot('abc')],
    ['zero', snapshot(0)],
    ['absent config', null]
  ])('throws rather than guessing when the budget is %s', (_label, stored) => {
    expect(() => frozenWeightedBudget(stored as any)).toThrow(TeConfigError);
  });
});

describe('getPrivateBallotError', () => {
  // At budget 100, 19 choices is the largest ballot that fits the sequencer's
  // 1 MB limit for a private vote; 20 would be created and could never be voted on.
  it.each([
    ['single-choice', 3, undefined],
    ['basic', 3, undefined],
    ['weighted', 3, undefined],
    ...['approval', 'quadratic', 'ranked-choice', 'copeland'].map(type => [
      type,
      3,
      `${type} voting is not supported with private voting`
    ]),
    ['weighted', 19, undefined],
    ['weighted', 20, 'private weighted voting allows at most 19 choices'],
    ['basic', 30, undefined]
  ] as [string, number, string | undefined][])(
    '%s with %p choices: %p',
    (type, numChoices, expected) => {
      expect(getPrivateBallotError(type, numChoices, 100)).toBe(expected);
    }
  );
});

describe('teSolverCeiling', () => {
  // The largest search the coordinator can solve (hardware-dependent, see
  // `shutter-governance-protocol/COORDINATOR_SIZING.md`). A NaN ceiling would
  // disable the guard and the tally would never finish.
  it.each([
    [undefined, DEFAULT_TE_SOLVER_CEILING],
    ['   ', DEFAULT_TE_SOLVER_CEILING],
    ['2.5e13', 2.5e13],
    ['1000', 1000]
  ])('reads %p as %p', (raw, expected) => {
    expect(teSolverCeiling({ TE_SOLVER_CEILING: raw } as any)).toBe(expected);
  });

  it.each(['abc', '0', '-1', 'Infinity'])(
    'refuses %p rather than disabling the guard',
    bad => {
      expect(() => teSolverCeiling({ TE_SOLVER_CEILING: bad } as any)).toThrow(
        /TE_SOLVER_CEILING/
      );
    }
  );
});

describe('ballotParamsColumn carries the scale', () => {
  // The pre-signing notice reads `te_config.scale`; without it a scaled
  // proposal would show "no scaling".
  const parse = (r: { te_config: string }) => JSON.parse(r.te_config);

  // A proposal with no frozen bound is not scaled, so 1 is correct there.
  it.each([
    [
      'no scaling needed',
      'weighted',
      { maxTotalWeight: 1e9, solverCeiling: 1e12 },
      100
    ],
    ['a missing snapshot', 'basic', undefined, 1],
    ['an unreadable snapshot', 'basic', null, 1]
  ])('is 1 for %s', (_label, type, snapshot, budget) => {
    const r = parse(ballotParamsColumn(['a', 'b'], type, 100, snapshot));
    expect(r.scale).toBe(1);
    // A non-weighted proposal always uses budget 1.
    expect(r.budget).toBe(budget);
  });

  it('follows the budget, which an author can still edit', () => {
    // Weighted uses 100x more of the bound than basic, so it needs a larger scale.
    const snapshot = { maxTotalWeight: 5.9e14, solverCeiling: 1e12 };
    const weighted = parse(
      ballotParamsColumn(['a'], 'weighted', 100, snapshot)
    );
    const basic = parse(ballotParamsColumn(['a'], 'basic', 100, snapshot));
    expect(weighted.scale).toBeGreaterThan(basic.scale);
    expect(basic.budget).toBe(1);
  });
});

describe('votingPowerFallback', () => {
  // For a space whose strategies give no bound, the fallback must be the largest V
  // that still leaves the tally unscaled. A flat 1e12 at budget 100 would force
  // s = 128 and count a 25,000-power holder as 195.
  it('leaves an unrecognised-strategy space unscaled at every supported budget', () => {
    delete process.env.TE_SOLVER_CEILING;
    for (const budget of [1, 2, 10, 100, 255]) {
      const V = votingPowerFallback(budget);
      expect(deriveScale(budget, V, DEFAULT_TE_SOLVER_CEILING)).toBe(1);
    }
  });

  it('tracks a non-default ceiling and never returns a non-positive bound', () => {
    process.env.TE_SOLVER_CEILING = '1e9';
    expect(votingPowerFallback(100)).toBe(1e7);
    expect(deriveScale(100, votingPowerFallback(100), 1e9)).toBe(1);
    process.env.TE_SOLVER_CEILING = '10';
    expect(votingPowerFallback(1e6)).toBe(1);
  });
});

describe('weightedBudgetFromEnv', () => {
  it('reads the deployment budget and rejects nonsense', () => {
    process.env.TE_WEIGHTED_BUDGET = '50';
    expect(weightedBudgetFromEnv()).toBe(50);
    process.env.TE_WEIGHTED_BUDGET = 'abc';
    expect(weightedBudgetFromEnv()).toBe(100);
    process.env.TE_WEIGHTED_BUDGET = '0';
    expect(weightedBudgetFromEnv()).toBe(100);
  });
});
