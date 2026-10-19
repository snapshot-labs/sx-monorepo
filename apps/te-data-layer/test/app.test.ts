/**
 * Tests the data-layer API against a stubbed hub: election id translation, hub
 * statuses passed through unchanged (the coordinator's retry logic depends on
 * them), and 501 for unsupported writes.
 */

import fetch from 'node-fetch';
import request from 'supertest';
import { buildApp } from '../src/app';

// ts-jest hoists this above the imports, so the app gets the mock.
jest.mock('node-fetch', () => jest.fn());

const mockFetch = fetch as unknown as jest.Mock;

const BARE = '1111111111111111111111111111111111111111111111111111111111111111';
const PREFIXED = `0x${BARE}`;
const HUB = `http://hub.test/api/proposal/${PREFIXED}`;

/** A hub reply. A 204 has no body, so reading it as JSON throws. */
function hubReplies(body: unknown, status = 200): void {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (status === 204) throw new Error('204 has no body');
      return body;
    },
    text: async () => (status === 204 ? '' : JSON.stringify(body))
  });
}

/** A hub reply read as text, for the routes that must not parse it. */
function hubRepliesRaw(text: string): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: async () => text
  });
}

function lastUrl(): string {
  return mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0];
}

function forwardedBody(): string {
  return mockFetch.mock.calls[0][1].body;
}

let app: ReturnType<typeof buildApp>;

/** Calls `/elections/:eid<suffix>` with the bare id. */
function call(method: string, suffix: string, body: unknown = {}) {
  const url = `/elections/${BARE}${suffix}`;
  return method === 'GET'
    ? request(app).get(url)
    : request(app)
        .post(url)
        .send(body as object);
}

beforeEach(() => {
  process.env.HUB_URL = 'http://hub.test';
  mockFetch.mockReset();
  app = buildApp();
});

// Tier 0: trusted for availability only, not integrity. Keypers probe it under
// /port before anything else.
it.each(['', '/port'])(
  'declares verifiability tier zero at %s/capability',
  async prefix => {
    const res = await request(app).get(`${prefix}/capability`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ verifiabilityTier: 0 });
  }
);

describe('election id translation', () => {
  // The protocol client sends bare hex; a hand-typed request may add `0x` or
  // mixed case. The hub always gets the lowercase `0x` form of the stored id.
  it.each([
    ['bare hex', BARE],
    ['0x-prefixed', PREFIXED],
    ['mixed case', BARE.toUpperCase()]
  ])(
    'accepts a %s id and sends the 0x form to the hub',
    async (_label, eid) => {
      hubReplies({ config: {} });
      await request(app).get(`/elections/${eid}`);
      expect(lastUrl()).toBe(`${HUB}/te_sgp_election`);
    }
  );

  // A malformed id must be 400 here, not forwarded to the hub where it could
  // give a confusing 404 or match another proposal.
  it.each([
    ['too short', 'abcd'],
    ['too long', `${BARE}00`],
    ['not hex', 'z'.repeat(64)],
    ['odd length', BARE.slice(1)]
  ])(
    'rejects an id that is %s, without calling the hub',
    async (_label, eid) => {
      const res = await request(app).get(`/elections/${eid}`);
      expect(res.status).toBe(400);
      expect(mockFetch).not.toHaveBeenCalled();
    }
  );

  // Paths use bare hex but JSON byte fields keep `0x`. The client rejects ids
  // without the prefix, so stripping it would hide every election.
  it('leaves listed election ids 0x-prefixed for the response body', async () => {
    hubReplies({ electionIds: [PREFIXED, `0x${'ab'.repeat(32)}`] });
    const res = await request(app).get('/elections');
    expect(res.body.electionIds).toEqual([PREFIXED, `0x${'ab'.repeat(32)}`]);
  });
});

describe('routes', () => {
  const record = {
    config: { electionId: PREFIXED, numCandidates: 2 },
    cancelled: false,
    tallyStalled: false,
    finalizedKey: null
  };
  const submissions = [
    { electionId: PREFIXED, pkElection: '0xaa', committeePKs: ['0xbb'] }
  ];
  const aggregate = {
    electionId: PREFIXED,
    aggregates: [{ c1: '0xaa', c2: '0xbb' }],
    admitted: [0, 1],
    exclusions: [{ sequenceNumber: 2, reason: 'INVALID_PROOF' }],
    totalAdmittedWeight: 3
  };
  const shares = [
    {
      electionId: PREFIXED,
      keyperIndex: 1,
      entries: [{ sigma: '0xaa', proof: '0xbb' }]
    }
  ];
  const result = {
    electionId: PREFIXED,
    totals: [3, 4],
    keyperIndices: [1, 2],
    bsgsBound: 7
  };
  const aggregateWrite = {
    aggregate: {
      electionId: PREFIXED,
      aggregates: [{ c1: '0xaa', c2: '0xbb' }],
      admitted: [0],
      exclusions: [],
      totalAdmittedWeight: 1
    },
    keyperSig: '0xsig'
  };
  const shareWrite = {
    share: {
      electionId: PREFIXED,
      keyperIndex: 2,
      entries: [{ sigma: '0xaa', proof: '0xbb' }]
    },
    keyperSig: '0xsig'
  };

  // Each route maps to one hub path, and returns the shape the protocol client
  // reads (for example ballots without the hub's `total`). Writes answer 204.
  it.each([
    {
      name: 'GET election, passed through untouched',
      method: 'GET',
      suffix: '',
      hub: `${HUB}/te_sgp_election`,
      reply: record,
      body: record
    },
    {
      name: 'GET finalized key, from the election read',
      method: 'GET',
      suffix: '/dkg/finalized',
      hub: `${HUB}/te_sgp_election`,
      reply: { finalizedKey: { pkElection: '0xaa', committeePKs: ['0xbb'] } },
      body: { finalizedKey: { pkElection: '0xaa', committeePKs: ['0xbb'] } }
    },
    {
      name: 'GET ballot count, asking the hub for a count only',
      method: 'GET',
      suffix: '/ballots/count',
      hub: `${HUB}/te_sgp_ballots?countOnly=1`,
      reply: { count: 7 },
      body: { count: 7 }
    },
    {
      name: 'GET ballots',
      method: 'GET',
      suffix: '/ballots',
      hub: `${HUB}/te_sgp_ballots`,
      reply: { ballots: [{ electionId: PREFIXED }], total: 1 },
      body: { ballots: [{ electionId: PREFIXED }] }
    },
    {
      name: 'GET dkg submissions',
      method: 'GET',
      suffix: '/dkg',
      hub: `${HUB}/te_sgp_dkg`,
      reply: { submissions },
      body: { submissions }
    },
    {
      name: 'GET canonical aggregate',
      method: 'GET',
      suffix: '/aggregate',
      hub: `${HUB}/te_sgp_aggregate`,
      reply: { aggregate },
      body: { aggregate }
    },
    {
      name: 'GET decryption shares',
      method: 'GET',
      suffix: '/shares',
      hub: `${HUB}/te_sgp_decryption_shares`,
      reply: { shares },
      body: { shares }
    },
    {
      name: 'GET published result',
      method: 'GET',
      suffix: '/result',
      hub: `${HUB}/te_result`,
      reply: { result },
      body: { result }
    },
    {
      name: 'POST dkg submission',
      method: 'POST',
      suffix: '/dkg',
      hub: `${HUB}/te_sgp_dkg`,
      send: { pkElection: '0xaa', committeePKs: ['0xbb'], keyperSig: '0xcc' },
      forwards: {
        pkElection: '0xaa',
        committeePKs: ['0xbb'],
        keyperSig: '0xcc'
      }
    },
    {
      name: 'POST aggregate, body unchanged',
      method: 'POST',
      suffix: '/aggregate',
      hub: `${HUB}/te_aggregate`,
      send: aggregateWrite,
      forwards: aggregateWrite
    },
    {
      name: 'POST decryption share, body unchanged',
      method: 'POST',
      suffix: '/shares',
      hub: `${HUB}/te_sgp_decryption_share`,
      send: shareWrite,
      forwards: shareWrite
    },
    {
      name: 'POST result with the publisher signature',
      method: 'POST',
      suffix: '/result',
      hub: `${HUB}/te_result`,
      send: { result, resultPublisherSig: '0xsig' },
      forwards: { result, resultPublisherSig: '0xsig' }
    },
    {
      name: 'POST tally stall with the publisher signature',
      method: 'POST',
      suffix: '/tally-stalled',
      hub: `${HUB}/te_tally_stalled`,
      send: { stalled: true, resultPublisherSig: '0xsig' },
      forwards: { stalled: true, resultPublisherSig: '0xsig' }
    }
  ])('$name', async ({ method, suffix, hub, reply, body, send, forwards }) => {
    if (method === 'GET') {
      hubReplies(reply);
      const res = await call(method, suffix);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(body);
    } else {
      hubReplies({}, 204);
      const res = await call(method, suffix, send);
      expect(res.status).toBe(204);
      expect(mockFetch.mock.calls[0][1].method).toBe('POST');
      expect(JSON.parse(forwardedBody())).toEqual(forwards);
    }
    expect(lastUrl()).toBe(hub);
  });

  it.each([{ finalizedKey: null }, {}])(
    'reports a missing finalized key as null rather than omitting it (hub sent %j)',
    async reply => {
      hubReplies(reply);
      const res = await call('GET', '/dkg/finalized');
      expect(res.body).toEqual({ finalizedKey: null });
    }
  );

  // Pagination that carries no information is left off.
  it.each([
    ['?start=10&count=5', `${HUB}/te_sgp_ballots?start=10&count=5`],
    ['?start=0&count=0', `${HUB}/te_sgp_ballots`]
  ])('forwards ballot pagination %s', async (query, url) => {
    hubReplies({ ballots: [] });
    await call('GET', `/ballots${query}`);
    expect(lastUrl()).toBe(url);
  });

  // No keyperIndex: the hub recovers it from the signature. Forwarding a
  // claimed index would let one keyper submit as another.
  it('forwards only the three dkg fields, dropping a claimed keyper index', async () => {
    hubReplies({}, 204);
    await call('POST', '/dkg', {
      pkElection: '0xaa',
      committeePKs: ['0xbb'],
      keyperSig: '0xcc',
      keyperIndex: 7
    });
    const body = JSON.parse(forwardedBody());
    expect(Object.keys(body).sort()).toEqual([
      'committeePKs',
      'keyperSig',
      'pkElection'
    ]);
    expect(body).toEqual({
      pkElection: '0xaa',
      committeePKs: ['0xbb'],
      keyperSig: '0xcc'
    });
  });

  // A stall carries the publisher signature and the coordinator's reason; a
  // resume carries the admin signature. The hub decides which key may sign which.
  it.each([
    {
      stalled: true,
      issuedAt: 1700000000,
      resultPublisherSig: '0xsig',
      reason: 'keyper 2 unreachable'
    },
    { stalled: false, issuedAt: 1700000001, adminSig: '0xadmin' }
  ])('forwards every tally-stall field (stalled=$stalled)', async body => {
    hubReplies({}, 204);
    await call('POST', '/tally-stalled', body);
    expect(JSON.parse(forwardedBody())).toEqual(body);
  });
});

// The totals and `totalAdmittedWeight` are signed and can exceed 2^53. Parsing
// them as doubles would round them and break the signature, so these routes
// pass the body through as text, byte for byte.
describe('exact big integers', () => {
  const BIG54 = '18014398509481985'; // 2^54 + 1
  const BIG53 = '9007199254740993'; // 2^53 + 1

  // A claimed keyperIndex in the aggregate is ignored by the hub, which uses the
  // signature.
  it.each([
    [
      '/aggregate',
      `{"aggregate":{"admitted":[],"totalAdmittedWeight":${BIG54}},"keyperSig":"0xsig","keyperIndex":3}`
    ],
    [
      '/result',
      `{"result":{"electionId":"${PREFIXED}","totals":[${BIG53},1],"keyperIndices":[1,2],"bsgsBound":${BIG53}},"resultPublisherSig":"0xsig"}`
    ]
  ])('forwards a POST %s body verbatim', async (suffix, raw) => {
    hubReplies({}, 204);
    await request(app)
      .post(`/elections/${BARE}${suffix}`)
      .set('content-type', 'application/json')
      .send(raw);
    expect(forwardedBody()).toBe(raw);
  });

  it.each([
    [
      '/aggregate',
      `{"aggregate":{"admitted":[],"totalAdmittedWeight":${BIG54}}}`,
      `"totalAdmittedWeight":${BIG54}`
    ],
    [
      '/result',
      `{"result":{"electionId":"${PREFIXED}","totals":[${BIG53}],"keyperIndices":[1],"bsgsBound":${BIG53}}}`,
      `"totals":[${BIG53}]`
    ]
  ])('keeps GET %s exact on the way back out', async (suffix, raw, exact) => {
    hubRepliesRaw(raw);
    const res = await call('GET', suffix);
    expect(res.text).toContain(exact);
  });
});

describe('status pass-through', () => {
  // The client maps each status to its own error type and the coordinator
  // decides from it whether to retry, so none may be remapped. For example 403
  // (misconfigured committee) stops the ceremony, 409 (quorum race) is only
  // logged, 422 (outside the window, or share before the aggregate) means retry
  // later. One route per hub client function, plus the other write routes.
  it.each([
    ...[404, 403, 409, 422, 400, 503, 429].map(s => ['GET', '', s]),
    ...[403, 409, 400, 503].map(s => ['POST', '/dkg', s]),
    ...[422, 409, 403].map(s => ['POST', '/aggregate', s]),
    ...[422, 409, 403].map(s => ['POST', '/shares', s]),
    ['POST', '/result', 403],
    ['POST', '/tally-stalled', 403],
    ['GET', '/aggregate', 404]
  ] as Array<[string, string, number]>)(
    '%s %s preserves hub status %i',
    async (method, suffix, status) => {
      hubReplies({ error: 'nope' }, status);
      const res = await call(method, suffix);
      expect(res.status).toBe(status);
    }
  );

  // 502 means the dependency failed and a retry may help; 500 would mean a bug here.
  it.each([
    ['GET', ''],
    ['POST', '/dkg'],
    ['POST', '/aggregate'],
    ['GET', '/aggregate']
  ])(
    'surfaces an unreachable hub on %s %s as 502, not 500',
    async (method, suffix) => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      const res = await call(method, suffix);
      expect(res.status).toBe(502);
      expect(res.body.error).toMatch(/hub unreachable/);
    }
  );

  it('reports a missing HUB_URL as a server fault', async () => {
    delete process.env.HUB_URL;
    const res = await request(buildApp()).get(`/elections/${BARE}`);
    expect(res.status).toBe(500);
  });
});

describe('unsupported writes', () => {
  // These protocol writes have no Snapshot equivalent. 501 makes sure a caller
  // never thinks it created an election or cast a ballot here.
  it.each([
    ['/elections', 'sequencer'],
    [`/elections/${BARE}/cancel`, 'cancellation'],
    [`/elections/${BARE}/ballots`, 'sequencer']
  ])('answers 501 for POST %s, explaining why', async (path, reason) => {
    const res = await request(app).post(path).send({});
    expect(res.status).toBe(501);
    expect(res.body.error).toContain(reason);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('the /port read mount', () => {
  // Keypers append `/port` to their base URL and read only from there. It is the
  // same read router as the root, so one read checks the mount.
  it('serves an election read identically to the root surface', async () => {
    const record = {
      config: { electionId: PREFIXED, numCandidates: 2 },
      cancelled: false,
      tallyStalled: false,
      finalizedKey: null
    };
    hubReplies(record);
    const viaPort = await request(app).get(`/port/elections/${BARE}`);
    hubReplies(record);
    const viaRoot = await request(app).get(`/elections/${BARE}`);

    expect(viaPort.status).toBe(200);
    expect(viaPort.body).toEqual(viaRoot.body);
  });

  // Keypers must send writes through the coordinator, so no write route may
  // answer under /port.
  it.each([
    `/port/elections/${BARE}/dkg`,
    `/port/elections/${BARE}/aggregate`,
    `/port/elections/${BARE}/shares`,
    `/port/elections/${BARE}/result`,
    `/port/elections/${BARE}/tally-stalled`,
    `/port/elections/${BARE}/ballots`
  ])('does not route the write %s', async path => {
    const res = await request(app).post(path).send({});
    expect(res.status).toBe(404);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
