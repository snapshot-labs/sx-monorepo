/**
 * The translator's contract, exercised against a stubbed hub.
 *
 * What matters here is not that requests are forwarded — it is that the protocol's
 * client sees exactly the contract it expects. Its callers branch on status type,
 * so a status collapsed to 500 changes the coordinator's behaviour: it retries what
 * it should abandon and abandons what it should retry. These tests pin the id
 * translation, the status pass-through, and the honest 501s.
 */

import fetch from 'node-fetch';
import request from 'supertest';
import { buildApp } from '../src/app';
import log from '../src/log';

// ts-jest hoists this above the imports, so `fetch` is already the mock by the
// time the app module resolves it.
jest.mock('node-fetch', () => jest.fn());

const mockFetch = fetch as unknown as jest.Mock;

const BARE = '1111111111111111111111111111111111111111111111111111111111111111';
const PREFIXED = `0x${BARE}`;

function hubReplies(body: unknown, status = 200): void {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  });
}

function lastUrl(): string {
  return mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0];
}

let app: ReturnType<typeof buildApp>;

beforeEach(() => {
  process.env.HUB_URL = 'http://hub.test';
  mockFetch.mockReset();
  app = buildApp();
});

describe('service basics', () => {
  it('reports health without touching the hub', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // Tier zero says: this data layer guarantees availability, not integrity. That
  // is the honest description — it can withhold an artifact but never forge one,
  // because every artifact is independently verifiable.
  it('declares verifiability tier zero', async () => {
    const res = await request(app).get('/capability');
    expect(res.body).toEqual({ verifiabilityTier: 0 });
  });

  it('404s an unknown route with a usable message', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no route for GET \/nope/);
  });
});

describe('election id translation', () => {
  it('accepts the bare hex the protocol client sends and prefixes it for the hub', async () => {
    hubReplies({ config: {}, cancelled: false });
    await request(app).get(`/elections/${BARE}`);
    expect(lastUrl()).toBe(
      `http://hub.test/api/proposal/${PREFIXED}/te_geg_election`
    );
  });

  it('also accepts a 0x-prefixed id, for a hand-typed request', async () => {
    hubReplies({ config: {} });
    await request(app).get(`/elections/${PREFIXED}`);
    expect(lastUrl()).toContain(PREFIXED);
  });

  it('lowercases a mixed-case id so it matches the stored proposal', async () => {
    hubReplies({ config: {} });
    await request(app).get(`/elections/${BARE.toUpperCase()}`);
    expect(lastUrl()).toContain(PREFIXED);
  });

  // A malformed id must be a clean 400 here. Forwarding it would surface as a
  // confusing 404 from the hub, or — worse — match a different proposal.
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

  // The contract is asymmetric: bare hex in path segments, `0x`-prefixed in every
  // JSON byte field. The client's decoder rejects a missing prefix, so stripping it
  // here would make it discard the entire list — and the coordinator would then see
  // no elections rather than an error it could attribute. Regression-guarded because
  // the earlier version of this test asserted the opposite and still passed.
  it('leaves listed election ids 0x-prefixed for the response body', async () => {
    hubReplies({ electionIds: [PREFIXED, `0x${'ab'.repeat(32)}`] });
    const res = await request(app).get('/elections');
    expect(res.body.electionIds).toEqual([PREFIXED, `0x${'ab'.repeat(32)}`]);
    for (const id of res.body.electionIds)
      expect(id.startsWith('0x')).toBe(true);
  });
});

describe('reads', () => {
  it('passes the election record through untouched', async () => {
    const record = {
      config: { electionId: PREFIXED, numCandidates: 2 },
      cancelled: false,
      tallyStalled: false,
      finalizedKey: null
    };
    hubReplies(record);
    const res = await request(app).get(`/elections/${BARE}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(record);
  });

  it('derives the finalized key from the same election read', async () => {
    hubReplies({
      finalizedKey: { pkElection: '0xaa', committeePKs: ['0xbb'] }
    });
    const res = await request(app).get(`/elections/${BARE}/dkg/finalized`);
    expect(res.body.finalizedKey).toEqual({
      pkElection: '0xaa',
      committeePKs: ['0xbb']
    });
  });

  it('reports a missing finalized key as null rather than omitting it', async () => {
    hubReplies({ finalizedKey: null });
    const res = await request(app).get(`/elections/${BARE}/dkg/finalized`);
    expect(res.body).toEqual({ finalizedKey: null });
  });

  it('asks the hub for a count only', async () => {
    hubReplies({ count: 7 });
    const res = await request(app).get(`/elections/${BARE}/ballots/count`);
    expect(lastUrl()).toContain('countOnly=1');
    expect(res.body).toEqual({ count: 7 });
  });

  it('forwards ballot pagination', async () => {
    hubReplies({ ballots: [] });
    await request(app).get(`/elections/${BARE}/ballots?start=10&count=5`);
    expect(lastUrl()).toContain('start=10');
    expect(lastUrl()).toContain('count=5');
  });

  it('omits pagination that carries no information', async () => {
    hubReplies({ ballots: [] });
    await request(app).get(`/elections/${BARE}/ballots?start=0&count=0`);
    expect(lastUrl()).toBe(
      `http://hub.test/api/proposal/${PREFIXED}/te_geg_ballots`
    );
  });

  it('returns ballots under the key the protocol client reads', async () => {
    hubReplies({ ballots: [{ electionId: PREFIXED }], total: 1 });
    const res = await request(app).get(`/elections/${BARE}/ballots`);
    expect(res.body).toEqual({ ballots: [{ electionId: PREFIXED }] });
  });
});

describe('dkg write path', () => {
  function hubAccepts204(): void {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => {
        throw new Error('204 has no body');
      }
    });
  }

  it('forwards a submission and answers 204', async () => {
    hubAccepts204();
    const res = await request(app)
      .post(`/elections/${BARE}/dkg`)
      .send({ pkElection: '0xaa', committeePKs: ['0xbb'], keyperSig: '0xcc' });
    expect(res.status).toBe(204);
    expect(lastUrl()).toBe(
      `http://hub.test/api/proposal/${PREFIXED}/te_geg_dkg`
    );
  });

  it('forwards exactly the three fields the port defines', async () => {
    hubAccepts204();
    await request(app)
      .post(`/elections/${BARE}/dkg`)
      .send({ pkElection: '0xaa', committeePKs: ['0xbb'], keyperSig: '0xcc' });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    // No keyperIndex: the hub recovers it from the signature, so a submission can
    // only ever count for whoever actually signed it. Forwarding a claimed index
    // would reintroduce exactly the impersonation this design removes.
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

  it('drops a claimed keyper index rather than passing it on', async () => {
    hubAccepts204();
    await request(app)
      .post(`/elections/${BARE}/dkg`)
      .send({
        pkElection: '0xaa',
        committeePKs: ['0xbb'],
        keyperSig: '0xcc',
        keyperIndex: 7
      });
    expect(
      JSON.parse(mockFetch.mock.calls[0][1].body).keyperIndex
    ).toBeUndefined();
  });

  it('uses POST, not GET', async () => {
    hubAccepts204();
    await request(app).post(`/elections/${BARE}/dkg`).send({});
    expect(mockFetch.mock.calls[0][1].method).toBe('POST');
  });

  // Each of these drives different coordinator behaviour, so none may be collapsed:
  // 403 means a misconfigured committee and should stop the ceremony, while 409 is
  // a benign quorum race that is merely logged.
  it.each([[403], [409], [400], [503]])(
    'preserves hub write status %i',
    async status => {
      hubReplies({ error: 'nope' }, status);
      const res = await request(app).post(`/elections/${BARE}/dkg`).send({});
      expect(res.status).toBe(status);
    }
  );

  it('rejects a malformed election id before calling the hub', async () => {
    const res = await request(app).post('/elections/nope/dkg').send({});
    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('surfaces an unreachable hub as 502 on writes too', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const res = await request(app).post(`/elections/${BARE}/dkg`).send({});
    expect(res.status).toBe(502);
  });

  it('returns submissions under the key the protocol client reads', async () => {
    const submissions = [
      { electionId: PREFIXED, pkElection: '0xaa', committeePKs: ['0xbb'] }
    ];
    hubReplies({ submissions });
    const res = await request(app).get(`/elections/${BARE}/dkg`);
    expect(res.body).toEqual({ submissions });
    expect(lastUrl()).toBe(
      `http://hub.test/api/proposal/${PREFIXED}/te_geg_dkg`
    );
  });
});

describe('status pass-through', () => {
  // The client maps each of these onto a distinct error type, and its callers
  // branch on the type. Remapping any of them changes coordinator behaviour.
  it.each([[404], [403], [409], [422], [400], [503]])(
    'preserves hub status %i',
    async status => {
      hubReplies({ error: 'nope' }, status);
      const res = await request(app).get(`/elections/${BARE}`);
      expect(res.status).toBe(status);
    }
  );

  it('surfaces an unreachable hub as 502, not 500', async () => {
    // 502 says "the dependency failed, retrying may help"; 500 would suggest a
    // bug in this service and invite the wrong response.
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const res = await request(app).get(`/elections/${BARE}`);
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/hub unreachable/);
  });

  it('reports a missing HUB_URL as a server fault', async () => {
    delete process.env.HUB_URL;
    const res = await request(buildApp()).get(`/elections/${BARE}`);
    expect(res.status).toBe(500);
  });
});

describe('unsupported writes', () => {
  // 501 rather than a plausible-looking success: these operations exist in the
  // protocol but have no Snapshot equivalent, and pretending otherwise would let
  // a caller believe it had registered an election or cast a ballot.
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
  // The keypers do not read the root surface. They are given a base URL and append
  // `/port` themselves, matching the prefix the protocol's own `api` service mounts
  // its read blueprint under — so this mount is what makes a keyper able to read
  // Snapshot's data layer at all, and what keeps its reach limited to reads.
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

  it('translates election ids under the prefix too', async () => {
    hubReplies({ submissions: [] });
    await request(app).get(`/port/elections/${BARE}/dkg`);
    expect(lastUrl()).toBe(
      `http://hub.test/api/proposal/${PREFIXED}/te_geg_dkg`
    );
  });

  it('forwards ballot pagination under the prefix', async () => {
    hubReplies({ ballots: [] });
    await request(app).get(`/port/elections/${BARE}/ballots?start=10&count=5`);
    expect(lastUrl()).toContain('start=10');
    expect(lastUrl()).toContain('count=5');
  });

  it('answers /capability, which the client probes before anything else', async () => {
    const res = await request(app).get('/port/capability');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ verifiabilityTier: 0 });
  });

  // The point of the split surface. A keyper relays its writes through the
  // coordinator; if a write route answered here, that indirection — and the
  // authorization that rides on it — would be optional rather than enforced.
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

describe('aggregate', () => {
  // The committee-owned aggregate: each keyper derives it independently and the
  // hub decides which one a quorum agreed on. The translator carries the
  // envelope and the signature, and adds nothing — the keyper index is not in
  // the payload because the hub recovers it from the signature.
  it('forwards a submission and answers 204', async () => {
    hubReplies({}, 204);
    const body = {
      aggregate: {
        electionId: PREFIXED,
        aggregates: [{ c1: '0xaa', c2: '0xbb' }],
        admitted: [0],
        exclusions: [],
        totalAdmittedWeight: 1
      },
      keyperSig: '0xsig'
    };
    const res = await request(app)
      .post(`/elections/${BARE}/aggregate`)
      .send(body);

    expect(res.status).toBe(204);
    expect(lastUrl()).toBe(
      `http://hub.test/api/proposal/${PREFIXED}/te_aggregate`
    );
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual(body);
  });

  it('drops anything the port does not define, including a claimed index', async () => {
    hubReplies({}, 204);
    await request(app)
      .post(`/elections/${BARE}/aggregate`)
      .send({
        aggregate: { admitted: [] },
        keyperSig: '0xsig',
        keyperIndex: 3
      });
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      aggregate: { admitted: [] },
      keyperSig: '0xsig'
    });
  });

  // 422 is the protocol's voting-window error and 409 its immutability error.
  // Collapsing either into 400 or 500 changes what the coordinator does next.
  it.each([
    [422, 'aggregate submitted before voting_end'],
    [409, 'aggregate already finalized (quorum reached)'],
    [403, 'not_a_registered_keyper']
  ])('passes hub status %s straight through', async (status, message) => {
    hubReplies({ error: message }, status as number);
    const res = await request(app)
      .post(`/elections/${BARE}/aggregate`)
      .send({ aggregate: {}, keyperSig: '0xsig' });
    expect(res.status).toBe(status);
  });

  it('reads the canonical aggregate', async () => {
    const aggregate = {
      electionId: PREFIXED,
      aggregates: [{ c1: '0xaa', c2: '0xbb' }],
      admitted: [0, 1],
      exclusions: [{ sequenceNumber: 2, reason: 'INVALID_PROOF' }],
      totalAdmittedWeight: 3
    };
    hubReplies({ aggregate });
    const res = await request(app).get(`/elections/${BARE}/aggregate`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ aggregate });
    expect(lastUrl()).toBe(
      `http://hub.test/api/proposal/${PREFIXED}/te_geg_aggregate`
    );
  });

  // Absence is a fact the coordinator acts on: no quorum yet means keep asking
  // the committee to derive. It must read as null, never as an error.
  it('reports no quorum as null rather than as a failure', async () => {
    hubReplies({ aggregate: null });
    const res = await request(app).get(`/elections/${BARE}/aggregate`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ aggregate: null });
  });

  it('serves the aggregate on the keyper read mount too', async () => {
    hubReplies({ aggregate: null });
    expect(
      (await request(app).get(`/port/elections/${BARE}/aggregate`)).status
    ).toBe(200);
  });

  it('does not route the write under /port', async () => {
    const res = await request(app)
      .post(`/port/elections/${BARE}/aggregate`)
      .send({ aggregate: {}, keyperSig: '0xsig' });
    expect(res.status).toBe(404);
  });
});

describe('decryption shares', () => {
  it('forwards a submission and answers 204', async () => {
    hubReplies({}, 204);
    const body = {
      share: {
        electionId: PREFIXED,
        keyperIndex: 2,
        entries: [{ sigma: '0xaa', proof: '0xbb' }]
      },
      keyperSig: '0xsig'
    };
    const res = await request(app).post(`/elections/${BARE}/shares`).send(body);
    expect(res.status).toBe(204);
    expect(lastUrl()).toBe(
      `http://hub.test/api/proposal/${PREFIXED}/te_geg_decryption_share`
    );
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual(body);
  });

  // A share before the committee agreed on what to decrypt is temporarily
  // wrong, not permanently malformed — 422 tells the caller to retry.
  it.each([
    [422, 'decryption share submitted before a canonical aggregate exists'],
    [409, 'keyper already submitted different shares'],
    [403, 'not_a_registered_keyper']
  ])('passes hub status %s straight through', async (status, message) => {
    hubReplies({ error: message }, status as number);
    const res = await request(app)
      .post(`/elections/${BARE}/shares`)
      .send({ share: { entries: [] }, keyperSig: '0xsig' });
    expect(res.status).toBe(status);
  });

  it('reads the per-keyper envelopes', async () => {
    const shares = [
      {
        electionId: PREFIXED,
        keyperIndex: 1,
        entries: [{ sigma: '0xaa', proof: '0xbb' }]
      }
    ];
    hubReplies({ shares });
    const res = await request(app).get(`/elections/${BARE}/shares`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ shares });
    expect(lastUrl()).toBe(
      `http://hub.test/api/proposal/${PREFIXED}/te_geg_decryption_shares`
    );
  });

  it('reports no shares as an empty list, not an error', async () => {
    hubReplies({ shares: [] });
    const res = await request(app).get(`/elections/${BARE}/shares`);
    expect(res.body).toEqual({ shares: [] });
  });

  it('does not route the write under /port', async () => {
    expect(
      (await request(app).post(`/port/elections/${BARE}/shares`).send({}))
        .status
    ).toBe(404);
  });
});

describe('published result', () => {
  const BIG = '9007199254740993'; // 2^53 + 1: rounds if it passes through a double

  it('forwards the publisher signature and answers 204', async () => {
    hubReplies({}, 204);
    const res = await request(app)
      .post(`/elections/${BARE}/result`)
      .send({
        result: {
          electionId: PREFIXED,
          totals: [1, 2],
          keyperIndices: [1, 2],
          bsgsBound: 10
        },
        resultPublisherSig: '0xsig'
      });
    expect(res.status).toBe(204);
    expect(lastUrl()).toBe(
      `http://hub.test/api/proposal/${PREFIXED}/te_result`
    );
  });

  // The totals are what the publisher signed. Re-serialising them here would
  // round anything above 2^53 and break a signature this service is not a party
  // to, so the body has to reach the hub as the bytes that arrived.
  it('forwards the body verbatim, keeping oversized totals exact', async () => {
    hubReplies({}, 204);
    const raw = `{"result":{"electionId":"${PREFIXED}","totals":[${BIG},1],"keyperIndices":[1,2],"bsgsBound":${BIG}},"resultPublisherSig":"0xsig"}`;
    await request(app)
      .post(`/elections/${BARE}/result`)
      .set('content-type', 'application/json')
      .send(raw);

    expect(mockFetch.mock.calls[0][1].body).toContain(`"totals":[${BIG},1]`);
    expect(mockFetch.mock.calls[0][1].body).not.toContain('9007199254740992');
  });

  it('reads a published result', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () =>
        `{"result":{"electionId":"${PREFIXED}","totals":[3,4],"keyperIndices":[1,2],"bsgsBound":7}}`
    });
    const res = await request(app).get(`/elections/${BARE}/result`);
    expect(res.status).toBe(200);
    expect(res.body.result.totals).toEqual([3, 4]);
  });

  it('keeps an oversized total exact on the way back out', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () =>
        `{"result":{"electionId":"${PREFIXED}","totals":[${BIG}],"keyperIndices":[1],"bsgsBound":${BIG}}}`
    });
    const res = await request(app).get(`/elections/${BARE}/result`);
    expect(res.text).toContain(BIG);
  });

  it('reports an unpublished result as null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '{"result":null}'
    });
    const res = await request(app).get(`/elections/${BARE}/result`);
    expect(res.body).toEqual({ result: null });
  });

  it('passes a 403 from the hub straight through', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: 'not_the_result_publisher' })
    });
    const res = await request(app)
      .post(`/elections/${BARE}/result`)
      .send({ result: {}, resultPublisherSig: '0xsig' });
    expect(res.status).toBe(403);
  });
});

describe('tally stall', () => {
  it('forwards a stall with the publisher signature', async () => {
    hubReplies({}, 204);
    const res = await request(app)
      .post(`/elections/${BARE}/tally-stalled`)
      .send({ stalled: true, resultPublisherSig: '0xsig' });
    expect(res.status).toBe(204);
    expect(lastUrl()).toBe(
      `http://hub.test/api/proposal/${PREFIXED}/te_tally_stalled`
    );
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      stalled: true,
      resultPublisherSig: '0xsig',
      adminSig: undefined
    });
  });

  it('forwards a resume with the admin signature', async () => {
    hubReplies({}, 204);
    await request(app)
      .post(`/elections/${BARE}/tally-stalled`)
      .send({ stalled: false, adminSig: '0xadmin' });
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toMatchObject({
      stalled: false,
      adminSig: '0xadmin'
    });
  });

  // Which key may sign which direction is the hub's decision; the translator
  // must not decide it, or the split could be enforced in two places and drift.
  it('passes a rejected direction straight through', async () => {
    hubReplies({ error: 'not_the_admin' }, 403);
    const res = await request(app)
      .post(`/elections/${BARE}/tally-stalled`)
      .send({ stalled: false, resultPublisherSig: '0xsig' });
    expect(res.status).toBe(403);
  });

  it('does not route the write under /port', async () => {
    expect(
      (
        await request(app)
          .post(`/port/elections/${BARE}/tally-stalled`)
          .send({ stalled: true })
      ).status
    ).toBe(404);
  });
});

describe('a rate-limited hub names itself in the log', () => {
  it('logs 429 at error level, with the consequence and the remedy', async () => {
    const errors: string[] = [];
    const spy = jest
      .spyOn(log, 'error')
      .mockImplementation((...args: unknown[]) => {
        errors.push(args.map(String).join(' '));
        return undefined as never;
      });
    try {
      hubReplies({ error: 'too many requests' }, 429);
      const res = await request(app).get(`/elections/${BARE}`);
      expect(res.status).toBe(429);

      const line = errors.join('\n');
      expect(line).toContain('429');
      // Names the cause, the symptom an operator will actually see, and the fix.
      expect(line).toMatch(/rate-limited/i);
      expect(line).toMatch(/stall/i);
      expect(line).toMatch(/exempt|limit/i);
    } finally {
      spy.mockRestore();
    }
  });

  // Other 4xx are ordinary and must stay at warn, or the distinction is lost.
  it('leaves an ordinary 4xx at warn', async () => {
    const errorSpy = jest
      .spyOn(log, 'error')
      .mockImplementation(() => undefined as never);
    const warnSpy = jest
      .spyOn(log, 'warn')
      .mockImplementation(() => undefined as never);
    try {
      hubReplies({ error: 'proposal_not_found' }, 404);
      await request(app).get(`/elections/${BARE}`);
      expect(warnSpy).toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });
});
