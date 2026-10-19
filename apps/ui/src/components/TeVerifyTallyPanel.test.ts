// @vitest-environment happy-dom
import { createTune } from '@snapshot-labs/tune';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as teVerify from '@/helpers/teVerify';
import TeVerifyTallyPanel from './TeVerifyTallyPanel.vue';

// The cryptography is not under test here: it is stubbed so each case can hand
// the panel exactly the verification outcome it should report.
const fetched = vi.hoisted(() => ({ audit: {} as any, ballots: {} as any }));
const outcome = vi.hoisted(() => ({ value: {} as any }));

vi.mock('@/helpers/teVerify', async importOriginal => ({
  ...(await importOriginal<typeof teVerify>()),
  fetchAuditPayload: vi.fn(async () => fetched.audit),
  fetchBallotsPayload: vi.fn(async () => fetched.ballots),
  diagnoseTally: () => ({ kind: 'published' })
}));

vi.mock('@/helpers/teVerifyClient', () => ({
  VerifyCancelled: class extends Error {},
  runVerify: () => ({
    cancel: () => {},
    result: Promise.resolve(outcome.value)
  })
}));

const ADDRESSES = [
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  '0xcccccccccccccccccccccccccccccccccccccccc'
];
const VERIFIED = 'Published tally verified';

/** A weighted proposal counted at scale 64: raw [100, 0] is [64, 0] in vp. */
function setup(opts: {
  scores: number[];
  aggregateMatches?: boolean;
  admittedSetResolved?: boolean;
}) {
  fetched.audit = {
    te_mpk: `0x${'11'.repeat(96)}`,
    te_keyper_addresses: ADDRESSES,
    aggregate: { num_candidates: 2, ciphertexts: [] },
    shares: [
      { keyper_index: 1, candidate: 0 },
      { keyper_index: 1, candidate: 1 },
      { keyper_index: 2, candidate: 0 },
      { keyper_index: 2, candidate: 1 }
    ]
  };
  fetched.ballots = { scale: 64, ballots: [] };
  outcome.value = {
    ballots: {
      total: 1,
      contributing: 1,
      aggregateMatches: opts.aggregateMatches ?? true,
      admittedSetResolved: opts.admittedSetResolved ?? true,
      exclusions: [],
      scaledToZero: []
    },
    tally: { tallies: [100n, 0n], verified: true, reason: null }
  };

  return mount(TeVerifyTallyPanel, {
    props: {
      apiBaseUrl: 'https://hub.test/api',
      proposal: {
        proposal_id: `0x${'22'.repeat(32)}`,
        choices: ['For', 'Against'],
        scores: opts.scores,
        te_config: { budget: 100, scale: 64 }
      } as any
    },
    global: { plugins: [createTune()] }
  });
}

async function verify(wrapper: ReturnType<typeof setup>) {
  const button = wrapper
    .findAll('button')
    .find(b => b.text() === 'Verify tally');
  await button!.trigger('click');
  await flushPromises();
}

describe('TeVerifyTallyPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows totals in voting power, applying the scale', async () => {
    const wrapper = setup({ scores: [64, 0] });
    await verify(wrapper);
    expect(wrapper.text()).toContain('64.00');
    expect(wrapper.text()).not.toContain('1.00');
  });

  it('is not verified when the totals disagree with the published scores', async () => {
    const wrapper = setup({ scores: [0, 64] });
    await verify(wrapper);
    expect(wrapper.text()).not.toContain(VERIFIED);
  });

  it('is not verified when the recomputed aggregate does not match', async () => {
    const wrapper = setup({ scores: [64, 0], aggregateMatches: false });
    await verify(wrapper);
    expect(wrapper.text()).not.toContain(VERIFIED);
  });

  it('is not verified when the admitted ballots could not all be resolved', async () => {
    const wrapper = setup({ scores: [64, 0], admittedSetResolved: false });
    await verify(wrapper);
    expect(wrapper.text()).not.toContain(VERIFIED);
  });

  it('is verified when every check agrees', async () => {
    const wrapper = setup({ scores: [64, 0] });
    await verify(wrapper);
    expect(wrapper.text()).toContain(VERIFIED);
  });

  it('names each keyper by its own address', async () => {
    const wrapper = setup({ scores: [64, 0] });
    await verify(wrapper);
    const detail = wrapper
      .findAll('button')
      .find(b => b.text().includes('cryptographic detail'));
    await detail!.trigger('click');
    const text = wrapper.html();
    // Keyper indices are 1-based: keyper 1 is ADDRESSES[0], keyper 2 is ADDRESSES[1].
    expect(text).toContain(ADDRESSES[0].slice(0, 6));
    expect(text).not.toContain(ADDRESSES[2].slice(0, 6));
  });
});
