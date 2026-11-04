// @vitest-environment happy-dom
import { createTune } from '@snapshot-labs/tune';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as teVerify from '@/helpers/teVerify';
import { shortenAddress } from '@/helpers/utils';
import TeVerifyTallyPanel from './TeVerifyTallyPanel.vue';

// The crypto is stubbed so each test can choose the verification result.
const fetched = vi.hoisted(() => ({ audit: {} as any, ballots: {} as any }));
const outcome = vi.hoisted(() => ({ value: {} as any, pending: false }));
const cancel = vi.hoisted(() => vi.fn());
const startRun = vi.hoisted(() => vi.fn());

vi.mock('@/helpers/teVerify', async importOriginal => ({
  ...(await importOriginal<typeof teVerify>()),
  fetchAuditPayload: vi.fn(async () => fetched.audit),
  fetchBallotsPayload: vi.fn(async () => fetched.ballots),
  diagnoseTally: () => ({ kind: 'published' })
}));

vi.mock('@/helpers/teVerifyClient', () => ({
  VerifyCancelled: class extends Error {},
  runVerify: () => {
    startRun();
    return {
      cancel,
      result: outcome.pending
        ? new Promise(() => {})
        : Promise.resolve(outcome.value)
    };
  }
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
  beforeEach(() => {
    vi.clearAllMocks();
    outcome.pending = false;
  });

  // Verified only when the totals check out, agree with the published scores,
  // the recomputed aggregate matches and every admitted ballot was found.
  it.each([
    ['every check agrees', { scores: [64, 0] }, true],
    ['the totals disagree with the scores', { scores: [0, 64] }, false],
    [
      'the recomputed aggregate does not match',
      { scores: [64, 0], aggregateMatches: false },
      false
    ],
    [
      'the admitted ballots could not all be resolved',
      { scores: [64, 0], admittedSetResolved: false },
      false
    ]
  ])('when %s, verified is %s', async (_label, opts, isVerified) => {
    const wrapper = setup(opts);
    await verify(wrapper);
    expect(wrapper.text().includes(VERIFIED)).toBe(isVerified);
  });

  it('shows totals in voting power, applying the scale', async () => {
    const wrapper = setup({ scores: [64, 0] });
    await verify(wrapper);
    expect(wrapper.text()).toContain('64.00');
    expect(wrapper.text()).not.toContain('1.00');
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
    expect(text).toContain(shortenAddress(ADDRESSES[0]));
    expect(text).not.toContain(shortenAddress(ADDRESSES[2]));
  });

  // Leaving the page must stop the worker, so verifying again does not start a
  // second one.
  it('stops a running verification when the panel is unmounted', async () => {
    const wrapper = setup({ scores: [64, 0] });
    outcome.pending = true;
    await verify(wrapper);
    expect(cancel).not.toHaveBeenCalled();
    wrapper.unmount();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  // Leaving while the ballots are still downloading must not start a worker
  // afterwards: nothing could stop it.
  it('does not start a verification after the panel is unmounted mid-download', async () => {
    const wrapper = setup({ scores: [64, 0] });
    startRun.mockClear();
    let release!: (audit: any) => void;
    vi.mocked(teVerify.fetchAuditPayload).mockImplementationOnce(
      () => new Promise(resolve => (release = resolve))
    );
    const button = wrapper
      .findAll('button')
      .find(b => b.text() === 'Verify tally');
    await button!.trigger('click');
    wrapper.unmount();
    release(fetched.audit);
    await flushPromises();
    expect(startRun).not.toHaveBeenCalled();
  });
});
