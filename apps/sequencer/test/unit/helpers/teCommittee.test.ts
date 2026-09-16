import fetch from 'node-fetch';
import {
  ballotParamsColumn,
  buildCommitteeSnapshot,
  clearCommitteeCache,
  committeeColumns,
  DEFAULT_TE_SOLVER_CEILING,
  deriveScale,
  frozenWeightedBudget,
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

// A real 48-byte compressed G1 point, borrowed from the protocol's own
// attestation vectors so the shape check is exercised against a genuine key.
const ELIGIBILITY_KEY =
  '0x972a59075fca0729b40b2cea5bb9685afdd219e77407e13631664c53b847cdcad45ab174a073aaa4122ad813fa094485';

const K1 = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
const K2 = '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359';
const K3 = '0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB';
// Checksums above and here are the canonical EIP-55 forms, cross-checked
// against eth_utils.to_checksum_address rather than written by hand.
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

function build(overrides: Partial<TeEnv> = {}) {
  return buildCommitteeSnapshot({
    maxTotalWeight: 1e6,
    env: env(overrides),
    eligibilityKey: ELIGIBILITY_KEY,
    // Recorded into the config; the live authority is the space's admins, checked
    // by the hub at resume time.
    adminAddress: ADMIN,
    ...window
  });
}

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
  it('parses urls and strips trailing slashes', async () => {
    expect(
      parseKeypers('https://k1.example.com/,https://k2.example.com')
    ).toEqual([
      { url: 'https://k1.example.com' },
      { url: 'https://k2.example.com' }
    ]);
  });

  it('treats an unset or blank value as no committee', async () => {
    expect(parseKeypers(undefined)).toEqual([]);
    expect(parseKeypers('   ')).toEqual([]);
  });

  it('tolerates whitespace and trailing separators', async () => {
    expect(parseKeypers(' https://k1.example.com , ')).toEqual([
      { url: 'https://k1.example.com' }
    ]);
  });

  // EIP-55 is hand-rolled here (the sequencer has no @ethersproject/address), so it
  // is checked against the canonical vectors from the EIP itself. A wrong checksum
  // silently fails to match the hub's write-authorisation lookup, which reads as
  // "not a registered keyper" on every write the committee makes.
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

  // The old format. Rejecting it by name beats a generic "must be a URL", because
  // the value looks obviously correct to whoever wrote it.
  it('rejects the old address@url form explicitly', async () => {
    expect(() => parseKeypers(`${K1}@https://k1.example.com`)).toThrow(
      /takes URLs only/
    );
  });

  it.each([
    ['a bare address', `${K1}`],
    ['a host with no scheme', 'k1.example.com'],
    ['an empty scheme', '://k1.example.com']
  ])('rejects %s', async (_label, raw) => {
    expect(() => parseKeypers(raw)).toThrow(TeConfigError);
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
      // Frozen alongside the committee: `s` derives from this pair, and a value
      // that moved after creation would change what a ballot is worth mid-flight.
      maxTotalWeight: 1e6,
      solverCeiling: DEFAULT_TE_SOLVER_CEILING
    });
  });

  it('derives n from the committee rather than trusting a separate value', async () => {
    const snapshot = await build({
      keypers: 'https://k1.example.com',
      thresholdT: '1'
    });
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

  it('accepts a single-keyper committee at t = 1', async () => {
    await expect(
      build({ keypers: 'https://k1.example.com', thresholdT: '1' })
    ).resolves.toMatchObject({ thresholdT: 1, thresholdN: 1 });
  });

  // Each of these produces a proposal whose key ceremony could never finish, so
  // they must fail at creation while the author can still see the error.
  it('rejects a quorum larger than the committee', async () => {
    await expect(build({ thresholdT: '4' })).rejects.toThrow(/1 <= t <= n/);
    await expect(build({ thresholdT: '9' })).rejects.toThrow(/1 <= t <= n/);
  });

  it('rejects a quorum of zero or less', async () => {
    await expect(build({ thresholdT: '0' })).rejects.toThrow(/1 <= t <= n/);
    await expect(build({ thresholdT: '-1' })).rejects.toThrow(/1 <= t <= n/);
  });

  // A minority quorum decrypts fine but cannot decide agreement: two disjoint
  // groups of one both "reach" a quorum of 1 in a committee of 3, so two
  // different artifacts could each claim to be canonical.
  it('rejects a quorum that is not a majority', async () => {
    await expect(build({ thresholdT: '1' })).rejects.toThrow(/not a majority/);
    await expect(
      build({
        keypers:
          'https://k1.example.com,https://k2.example.com,https://k3.example.com',
        thresholdT: '1'
      })
    ).rejects.toThrow(/use t >= 2/);
  });

  // Two URLs, one key: n looks like 2 but the committee is one operator, so a
  // quorum of 2 is satisfiable alone. Caught on the resolved addresses.
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

  it('rejects an unconfigured committee', async () => {
    await expect(build({ keypers: undefined })).rejects.toThrow(/TE_KEYPERS/);
  });

  it('requires TE_RESULT_PUBLISHER_ADDRESS', async () => {
    await expect(build({ resultPublisherAddress: undefined })).rejects.toThrow(
      'TE_RESULT_PUBLISHER_ADDRESS'
    );
  });

  it('records the admin address it is given', async () => {
    await expect(build()).resolves.toMatchObject({ adminAddress: ADMIN });
  });

  it('rejects a non-address role key', async () => {
    await expect(
      build({ resultPublisherAddress: 'not-an-address' })
    ).rejects.toThrow(/not an address/);
  });

  it('rejects a non-integer threshold', async () => {
    await expect(build({ thresholdT: '1.5' })).rejects.toThrow(
      /must be an integer/
    );
  });

  it('rejects a weighted budget below 1, which would make every split zero', async () => {
    await expect(build({ weightedBudget: '0' })).rejects.toThrow(/>= 1/);
  });

  it('rejects a malformed eligibility key', async () => {
    await expect(
      buildCommitteeSnapshot({
        maxTotalWeight: 1e6,
        env: env(),
        adminAddress: ADMIN,
        eligibilityKey: '0xdeadbeef',
        ...window
      })
    ).rejects.toThrow(/compressed G1/);
  });

  it('rejects a window that ends before it starts', async () => {
    await expect(
      buildCommitteeSnapshot({
        maxTotalWeight: 1e6,
        env: env(),
        adminAddress: ADMIN,
        eligibilityKey: ELIGIBILITY_KEY,
        votingStart: 200,
        votingEnd: 100
      })
    ).rejects.toThrow(/must be after/);
    await expect(
      buildCommitteeSnapshot({
        maxTotalWeight: 1e6,
        env: env(),
        adminAddress: ADMIN,
        eligibilityKey: ELIGIBILITY_KEY,
        votingStart: 100,
        votingEnd: 100
      })
    ).rejects.toThrow(/must be after/);
  });
});

describe('resolveCommittee', () => {
  const urls =
    'https://k1.example.com,https://k2.example.com,https://k3.example.com';

  it('reads each address from the keyper that will sign with it', async () => {
    await expect(build({ keypers: urls })).resolves.toMatchObject({
      keypers: [
        { address: K1, url: 'https://k1.example.com' },
        { address: K2, url: 'https://k2.example.com' },
        { address: K3, url: 'https://k3.example.com' }
      ]
    });
  });

  // Resolving per proposal would mean one unattended lookup per creation, each a
  // fresh chance to be answered by the wrong host. Once per process, then frozen.
  it('resolves once and reuses the result', async () => {
    await build({ keypers: urls });
    const afterFirst = mockFetch.mock.calls.length;
    await build({ keypers: urls });
    expect(mockFetch.mock.calls.length).toBe(afterFirst);
    expect(afterFirst).toBe(3);
  });

  it('re-resolves when the configured committee changes', async () => {
    await build({ keypers: urls });
    const afterFirst = mockFetch.mock.calls.length;
    await build({
      keypers: 'https://k1.example.com,https://k2.example.com',
      thresholdT: '2'
    });
    expect(mockFetch.mock.calls.length).toBeGreaterThan(afterFirst);
  });

  it('names the keyper it could not reach', async () => {
    statusReturns({
      'https://k1.example.com': K1,
      'https://k2.example.com': new Error('socket hang up'),
      'https://k3.example.com': K3
    });
    await expect(build({ keypers: urls })).rejects.toThrow(
      /cannot resolve keyper at https:\/\/k2\.example\.com/
    );
  });

  it('rejects a keyper whose /status is not an address', async () => {
    mockFetch.mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ address: 'nonsense' })
    }));
    await expect(build({ keypers: urls })).rejects.toThrow(/valid address/);
  });

  it('rejects a non-200 /status', async () => {
    mockFetch.mockImplementation(async () => ({ ok: false, status: 503 }));
    await expect(build({ keypers: urls })).rejects.toThrow(/HTTP 503/);
  });

  // Unreachable is fatal on purpose: the committee is frozen onto the proposal and
  // the DKG needs every member, so accepting an absent keyper only moves the
  // failure to voting_start, where it is terminal and the author can do nothing.
  it('refuses to freeze a committee it cannot fully reach', async () => {
    statusReturns({
      'https://k2.example.com': K2,
      'https://k3.example.com': K3
    });
    await expect(build({ keypers: urls })).rejects.toThrow(
      /cannot resolve keyper at https:\/\/k1\.example\.com/
    );
  });

  it('is exported for callers that want the addresses without a snapshot', async () => {
    await expect(
      resolveCommittee(parseKeypers(urls), urls)
    ).resolves.toHaveLength(3);
  });
});

describe('committeeColumns', () => {
  it('denormalises the committee for readers that already exist', async () => {
    const snapshot = await build();
    const columns = committeeColumns(snapshot);

    // The quorum, denormalised for readers that predate te_geg_config: the UI's
    // "2-of-3" label and the tally's share-count gate both read this column.
    expect(columns.te_threshold_t).toBe(2);
    expect(columns.te_threshold_n).toBe(3);
    expect(JSON.parse(columns.te_keyper_urls)).toEqual([
      'https://k1.example.com',
      'https://k2.example.com',
      'https://k3.example.com'
    ]);
    // Checksummed, because the hub's authorisation path compares against
    // getAddress() output and a lowercase copy would never match.
    expect(JSON.parse(columns.te_keyper_addresses)).toEqual([K1, K2, K3]);
    // The snapshot is the authority; the columns above are copies of it.
    expect(JSON.parse(columns.te_geg_config)).toEqual(snapshot);
  });

  it('keeps the denormalised arrays aligned with the snapshot order', async () => {
    const columns = committeeColumns(await build());
    const addresses = JSON.parse(columns.te_keyper_addresses);
    const urls = JSON.parse(columns.te_keyper_urls);
    const snapshot = JSON.parse(columns.te_geg_config);
    snapshot.keypers.forEach((k: any, i: number) => {
      expect(addresses[i]).toBe(k.address);
      expect(urls[i]).toBe(k.url);
    });
  });
});

describe('frozenWeightedBudget / ballotParamsColumn', () => {
  const snapshot = (weightedBudget: unknown) =>
    JSON.stringify({ v: 1, weightedBudget, eligibilityKey: '0x00' });

  it.each([
    ['a JSON string', snapshot(100), 100],
    ['an already-parsed object', { weightedBudget: 50 }, 50]
  ])('reads the frozen budget from %s', (_label, stored, expected) => {
    expect(frozenWeightedBudget(stored)).toBe(expected);
  });

  // Refusing beats defaulting. A default here would be the environment read this
  // function exists to remove, reintroduced silently.
  it.each([
    ['missing', snapshot(undefined)],
    ['not a number', snapshot('abc')],
    ['zero', snapshot(0)],
    ['absent config', null]
  ])('throws rather than guessing when the budget is %s', (_label, stored) => {
    expect(() => frozenWeightedBudget(stored as any)).toThrow(TeConfigError);
  });

  // The regression this whole change is about (M-2). `te_config` and
  // `te_geg_config` are both written at creation from one env read, so they agree
  // — until the env moves and the proposal is edited. Only `te_config` used to be
  // rebuilt, so the browser and ingest would agree on the new budget while the
  // committee verified against the old one, rejecting every ballot as
  // INVALID_PROOF and publishing zeros.
  it('follows the frozen snapshot, not a changed environment', () => {
    const frozen = snapshot(100);
    process.env.TE_WEIGHTED_BUDGET = '50'; // operator changed it after creation
    try {
      const { te_config } = ballotParamsColumn(
        ['a', 'b'],
        'weighted',
        frozenWeightedBudget(frozen)
      );
      expect(JSON.parse(te_config).budget).toBe(100);
    } finally {
      delete process.env.TE_WEIGHTED_BUDGET;
    }
  });

  it('still uses budget 1 for a non-weighted proposal', () => {
    expect(
      JSON.parse(ballotParamsColumn(['a', 'b'], 'basic', 100).te_config).budget
    ).toBe(1);
  });
});

describe('teSolverCeiling', () => {
  /**
   * The single definition of how large a search this deployment can solve.
   *
   * geg no longer decides this: feasibility depends on the coordinator's hardware,
   * which a library cannot see (see W17 and docs/COORDINATOR_SIZING.md). That makes
   * this the one place the number lives, so it has to reject garbage rather than
   * coerce it — a silently-NaN ceiling would disable the guard entirely and only
   * show up as a tally that never finishes.
   */
  it('defaults when unset or blank', () => {
    expect(teSolverCeiling({} as any)).toBe(DEFAULT_TE_SOLVER_CEILING);
    expect(teSolverCeiling({ TE_SOLVER_CEILING: '   ' } as any)).toBe(
      DEFAULT_TE_SOLVER_CEILING
    );
  });

  it('reads an explicit value, including exponent notation', () => {
    expect(teSolverCeiling({ TE_SOLVER_CEILING: '2.5e13' } as any)).toBe(
      2.5e13
    );
    expect(teSolverCeiling({ TE_SOLVER_CEILING: '1000' } as any)).toBe(1000);
  });

  it('refuses values that would disable the guard rather than raising it', () => {
    for (const bad of ['abc', '0', '-1', 'Infinity']) {
      expect(() => teSolverCeiling({ TE_SOLVER_CEILING: bad } as any)).toThrow(
        /TE_SOLVER_CEILING/
      );
    }
  });
});

describe('ballotParamsColumn carries the scale', () => {
  /**
   * The voter is told, before signing, what their power will count as. That notice
   * reads `te_config.scale`, so if this column omits it the notice silently says
   * "no scaling" on a scaled proposal — the exact surprise it exists to prevent.
   */
  const parse = (r: { te_config: string }) => JSON.parse(r.te_config);

  test('is 1 when the proposal needs no scaling', () => {
    const r = parse(
      ballotParamsColumn(['a', 'b'], 'weighted', 100, {
        maxTotalWeight: 1e9,
        solverCeiling: 1e12
      })
    );
    expect(r.scale).toBe(1);
  });

  test('follows the budget, which an author can still edit', () => {
    // weighted spends 100x more of the bound than basic, so the same space needs a
    // larger scale on a weighted proposal.
    const snapshot = { maxTotalWeight: 5.9e14, solverCeiling: 1e12 };
    const weighted = parse(
      ballotParamsColumn(['a'], 'weighted', 100, snapshot)
    );
    const basic = parse(ballotParamsColumn(['a'], 'basic', 100, snapshot));
    expect(weighted.scale).toBeGreaterThan(basic.scale);
    expect(basic.budget).toBe(1);
  });

  test('degrades to 1 when the snapshot is missing or unreadable', () => {
    // A proposal with no frozen bound is not a scaled proposal, so 1 is the correct
    // reading rather than a failure.
    expect(parse(ballotParamsColumn(['a'], 'basic', 100)).scale).toBe(1);
    expect(parse(ballotParamsColumn(['a'], 'basic', 100, null)).scale).toBe(1);
  });

  test('agrees with the hub, which emits the same number to the committee', () => {
    // Two copies: this one faces the voter, the hub's faces the keypers. If they
    // disagree, a voter is told one thing and counted by another.
    const cases: [number, number, number][] = [
      [100, 1e9, 1e12],
      [100, 5.9e14, 1e12],
      [1, 5.9e14, 1e12]
    ];
    for (const [budget, v, ceiling] of cases) {
      const viaColumn = parse(
        ballotParamsColumn(['a'], budget === 1 ? 'basic' : 'weighted', budget, {
          maxTotalWeight: v,
          solverCeiling: ceiling
        })
      ).scale;
      expect(viaColumn).toBe(
        deriveScale(budget === 1 ? 1 : budget, v, ceiling)
      );
    }
  });
});

describe('votingPowerFallback', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  // The live-run regression. A space whose strategies yield no bound used to fall
  // back to a flat 1e12, which at budget 100 exceeds the 1e12 ceiling and forces
  // s = 128 -- a 25,000-power holder was counted as 195. The fallback must be the
  // largest V that still leaves the tally unscaled.
  it('leaves an unrecognised-strategy space unscaled at every supported budget', () => {
    delete process.env.TE_SOLVER_CEILING;
    for (const budget of [1, 2, 10, 100, 255]) {
      const V = votingPowerFallback(budget);
      expect(deriveScale(budget, V, DEFAULT_TE_SOLVER_CEILING)).toBe(1);
    }
  });

  it('tracks a non-default ceiling', () => {
    process.env.TE_SOLVER_CEILING = '1e9';
    expect(votingPowerFallback(100)).toBe(1e7);
    expect(deriveScale(100, votingPowerFallback(100), 1e9)).toBe(1);
  });

  // Derived, not configured: there is deliberately no override. A knob here could
  // only be set wrong -- above this value it forces needless scaling, below it, it
  // forces needless scaling and narrows the H9 alarm. `TE_SOLVER_CEILING` is the
  // only honest way to move this number, and this pins that it is the only input.
  it('ignores any TE_VOTING_POWER_FALLBACK left in the environment', () => {
    delete process.env.TE_SOLVER_CEILING;
    process.env.TE_VOTING_POWER_FALLBACK = '5000';
    expect(votingPowerFallback(100)).toBe(
      Math.floor(DEFAULT_TE_SOLVER_CEILING / 100)
    );
  });

  it('never returns a non-positive bound', () => {
    process.env.TE_SOLVER_CEILING = '10';
    expect(votingPowerFallback(1e6)).toBe(1);
  });
});

describe('weightedBudgetFromEnv', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('reads the deployment budget and rejects nonsense', () => {
    process.env.TE_WEIGHTED_BUDGET = '50';
    expect(weightedBudgetFromEnv()).toBe(50);
    process.env.TE_WEIGHTED_BUDGET = 'abc';
    expect(weightedBudgetFromEnv()).toBe(100);
    process.env.TE_WEIGHTED_BUDGET = '0';
    expect(weightedBudgetFromEnv()).toBe(100);
  });
});
