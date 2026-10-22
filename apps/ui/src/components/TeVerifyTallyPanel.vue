<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import {
  AuditPayload,
  BallotAggregateResult,
  BallotsPayload,
  buildVerificationBundle,
  diagnoseTally,
  fetchAuditPayload,
  fetchBallotsPayload,
  fingerprintHex,
  TallyDiagnosis,
  VerifyProgress,
  VerifyResult
} from '@/helpers/teVerify';
import { runVerify, VerifyCancelled } from '@/helpers/teVerifyClient';
import { shortenAddress } from '@/helpers/utils';
import { Proposal } from '@/types';

const props = defineProps<{
  proposal: Proposal;
  /** Hub root, ending in `/api` (e.g. `https://hub.snapshot.org/api`). */
  apiBaseUrl: string;
}>();

type Status =
  | { kind: 'idle' }
  | { kind: 'fetching' }
  | { kind: 'verifying'; progress: VerifyProgress | null }
  | {
      kind: 'ok';
      tallies: bigint[];
      matches: boolean;
      /** The totals, in voting power, equal the proposal's published scores. */
      scoresAgree: boolean;
      reason: string | null;
      ballots: BallotAggregateResult;
      audit: AuditPayload;
      ballotsPayload: BallotsPayload;
      tally: VerifyResult;
    }
  /**
   * No published tally yet, with the reason from `diagnoseTally`. This panel only
   * shows for `completed` proposals, so this means the proposal state and the
   * committee's data disagree. Before completion, `TeTallyStalledNotice` shows
   * instead.
   */
  | {
      kind: 'pending';
      diagnosis: Exclude<TallyDiagnosis, { kind: 'published' }>;
    }
  | { kind: 'err'; message: string };

const status = ref<Status>({ kind: 'idle' });
/** Set while a run is in flight, so the user can stop it. */
const cancelRun = ref<(() => void) | null>(null);
// Stop the worker when leaving the page, so a later run does not start a second one.
// A run still downloading has no worker yet; the flag keeps it from starting one.
let isUnmounted = false;
onBeforeUnmount(() => {
  isUnmounted = true;
  cancelRun.value?.();
});
/**
 * Button label while working. Progress is shown in ballots, because the aggregate
 * step takes most of the time; the tally check takes a couple of seconds.
 */
const verifyingLabel = computed(() => {
  if (status.value.kind !== 'verifying') return 'Verifying...';
  const p = status.value.progress;
  if (!p) return 'Verifying...';
  if (p.phase === 'tally') return 'Checking the published tally...';
  return `Recomputing the aggregate... ${p.done}/${p.total} ballots`;
});

const showDetail = ref(false);
const showIntro = ref(false);

async function run() {
  status.value = { kind: 'fetching' };
  try {
    const proposalId = props.proposal.proposal_id as string;
    const [payload, ballotsPayload] = await Promise.all([
      fetchAuditPayload(props.apiBaseUrl, proposalId),
      fetchBallotsPayload(
        props.apiBaseUrl,
        proposalId,
        Number((props.proposal.te_config as any)?.scale ?? 1)
      )
    ]);
    if (isUnmounted) return;
    // If there is no result yet, show whether keypers or the coordinator are behind.
    const diagnosis = diagnoseTally(payload);
    if (diagnosis.kind !== 'published') {
      status.value = { kind: 'pending', diagnosis };
      return;
    }

    status.value = { kind: 'verifying', progress: null };
    // Runs in a worker: the check can take tens of seconds, which would freeze the
    // tab on the main thread.
    const run = runVerify(
      { proposalId, payload, ballotsPayload, budget: budget.value },
      progress => {
        if (status.value.kind === 'verifying') {
          status.value = { kind: 'verifying', progress };
        }
      }
    );
    cancelRun.value = run.cancel;
    const { ballots, tally: result } = await run.result;

    // Also compare with `proposal.scores`, the numbers the results page shows.
    const scores = props.proposal.scores ?? [];
    const scale = ballotsPayload.scale ?? 1;
    const scoresAgree =
      result.tallies.length === scores.length &&
      result.tallies.every((t, i) => {
        const a = (Number(t) * scale) / budget.value;
        const b = Number(scores[i]);
        return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
      });

    status.value = {
      kind: 'ok',
      tallies: result.tallies,
      matches: result.verified,
      scoresAgree,
      reason: result.reason,
      ballots,
      audit: payload,
      ballotsPayload,
      tally: result
    };
  } catch (err: any) {
    // A cancel is not an error.
    status.value =
      err instanceof VerifyCancelled
        ? { kind: 'idle' }
        : { kind: 'err', message: err?.message || String(err) };
  } finally {
    cancelRun.value = null;
  }
}

// ---- engine-room derived views (only meaningful once status.kind==='ok') ----

/** Fingerprint of the homomorphic aggregate the keypers decrypted. */
const aggregateFingerprint = computed(() => {
  if (status.value.kind !== 'ok') return '';
  const parts: string[] = [];
  for (const ct of status.value.audit.aggregate.ciphertexts) {
    parts.push(ct.c1, ct.c2);
  }
  return parts.length ? fingerprintHex(parts) : '-';
});

const mpkFingerprint = computed(() => {
  if (status.value.kind !== 'ok') return '';
  return fingerprintHex([status.value.audit.te_mpk]);
});

/** Per-keyper participation: how many candidate shares each keyper submitted. */
const keyperRows = computed(() => {
  if (status.value.kind !== 'ok') return [];
  const audit = status.value.audit;
  const byKeyper = new Map<number, number>();
  for (const s of audit.shares) {
    byKeyper.set(s.keyper_index, (byKeyper.get(s.keyper_index) || 0) + 1);
  }
  const addresses: string[] = Array.isArray(audit.te_keyper_addresses)
    ? audit.te_keyper_addresses
    : [];
  return Array.from(byKeyper.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([idx, shares]) => ({
      index: idx,
      // Keyper indices are 1-based; the address list is not.
      address: addresses[idx - 1] ?? null,
      shares
    }));
});

/**
 * Admitted ballots that round to zero at this proposal's scale. Shown so they do
 * not look like missing ballots.
 */
const scaledToZeroSummary = computed(() => {
  if (status.value.kind !== 'ok') return null;
  const { scaledToZero } = status.value.ballots;
  if (!scaledToZero.length) return null;

  return {
    count: scaledToZero.length,
    held: scaledToZero.reduce((acc, c) => acc + c.vp, 0),
    scale: status.value.ballotsPayload.scale ?? 1
  };
});

const exclusionSummary = computed(() => {
  if (status.value.kind !== 'ok') return null;
  const { exclusions } = status.value.ballots;
  if (!exclusions?.length) return null;

  const byReason = new Map<string, number>();
  for (const e of exclusions) {
    byReason.set(e.reason, (byReason.get(e.reason) ?? 0) + 1);
  }
  return {
    count: exclusions.length,
    reasons: [...byReason.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => ({ reason, count }))
  };
});

const numCandidates = computed(() =>
  status.value.kind === 'ok' ? status.value.audit.aggregate.num_candidates : 0
);

/**
 * The proposal's ballot budget. Raw tallies are multiplied by it (for example 100
 * for weighted voting), so they are divided by it for display. It is 1 for
 * single-choice voting.
 */
const budget = computed(() => (props.proposal.te_config as any)?.budget ?? 1);

/**
 * Every check passed: the totals verify, the ballots add up to the aggregate, every
 * admitted ballot was found, and the totals match the shown scores.
 */
const isFullyVerified = computed(
  () =>
    status.value.kind === 'ok' &&
    status.value.matches === true &&
    status.value.ballots.aggregateMatches &&
    status.value.ballots.admittedSetResolved &&
    status.value.scoresAgree
);

/**
 * Converts a raw tally to voting power the same way the sequencer does for
 * `proposal.scores`: `raw × scale / budget`.
 */
function formatTally(raw: bigint): string {
  const scale =
    status.value.kind === 'ok' ? status.value.ballotsPayload.scale ?? 1 : 1;
  const value = (Number(raw) * scale) / budget.value;
  return budget.value === 1 ? value.toString() : value.toFixed(2);
}

function downloadBundle() {
  if (status.value.kind !== 'ok') return;
  const bundle = buildVerificationBundle({
    proposalId: props.proposal.proposal_id as string,
    choices: props.proposal.choices || [],
    publishedScores: props.proposal.scores || [],
    audit: status.value.audit,
    ballots: status.value.ballotsPayload,
    ballotResult: status.value.ballots,
    tallyResult: status.value.tally
  });
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const shortId = (props.proposal.proposal_id as string).slice(0, 10);
  a.download = `private-vote-audit-${shortId}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="border rounded-lg px-3 py-2.5 mt-2.5 space-y-2">
    <div class="flex items-center gap-2 text-skin-link font-semibold">
      <IH-shield-check class="size-[18px]" />
      Permanent private tally
    </div>
    <div class="text-skin-text text-sm">
      Every ballot was encrypted under a threshold key and never individually
      decrypted, yet anyone can independently confirm the published result.
      <button
        type="button"
        class="text-skin-link inline-flex items-center gap-0.5 align-baseline"
        @click="showIntro = !showIntro"
      >
        {{ showIntro ? 'Show less' : 'How?' }}
        <IH-chevron-right
          class="size-[13px] transition-transform"
          :class="{ 'rotate-90': showIntro }"
        />
      </button>
    </div>
    <ol
      v-if="showIntro"
      class="text-skin-text text-sm list-decimal pl-5 space-y-0.5"
    >
      <li>
        Recompute the voting-power-weighted aggregate from every encrypted
        ballot and confirm it matches what the keypers decrypted.
      </li>
      <li>
        Recompute the totals from the keypers' public decryption shares, proving
        the scores were neither forged nor stuffed with invalid votes.
      </li>
    </ol>
    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="border rounded-lg px-3 py-1.5 hover:bg-skin-border"
        :disabled="status.kind === 'fetching' || status.kind === 'verifying'"
        @click="run"
      >
        <span v-if="status.kind === 'fetching'">Fetching ballots...</span>
        <span v-else-if="status.kind === 'verifying'">{{
          verifyingLabel
        }}</span>
        <span v-else>Verify tally</span>
      </button>
      <button
        v-if="status.kind === 'verifying' && cancelRun"
        type="button"
        class="border rounded-lg px-3 py-1.5 hover:bg-skin-border"
        @click="cancelRun()"
      >
        Stop
      </button>
      <span
        v-if="isFullyVerified"
        class="text-sm text-skin-success flex items-center gap-1"
      >
        <!-- `shrink-0` stops the icon shrinking when this line wraps. -->
        <IH-check-circle class="size-[16px] shrink-0" />
        Published tally verified against the decryption shares.
      </span>
      <span
        v-else-if="status.kind === 'ok' && status.matches === true"
        class="text-sm text-skin-danger flex items-center gap-1"
      >
        <IH-x-circle class="size-[16px] shrink-0" />
        The decryption shares verify, but not every check below agrees.
      </span>
      <span
        v-else-if="status.kind === 'ok' && status.matches === false"
        class="text-sm text-skin-danger flex items-start gap-1"
      >
        <IH-x-circle class="size-[16px] shrink-0 mt-[3px]" />
        <span>
          The published tally does not verify against the decryption shares.
          <span v-if="status.reason" class="block break-all">{{
            status.reason
          }}</span>
        </span>
      </span>
      <span
        v-else-if="status.kind === 'pending'"
        class="text-sm text-skin-link flex items-start gap-1"
      >
        <IH-clock class="size-[16px] shrink-0 mt-[3px]" />
        <span>
          <template v-if="status.diagnosis.kind === 'awaiting-shares'">
            The keyper committee has not published enough decryption shares yet
            ({{ status.diagnosis.candidatesShort }}
            {{ status.diagnosis.candidatesShort === 1 ? 'choice' : 'choices' }}
            still short of {{ status.diagnosis.need }}). There is no tally to
            verify until they do.
          </template>
          <template v-else>
            Every decryption share is present, but the coordinator has not
            published a result yet.
          </template>
        </span>
      </span>
      <span
        v-else-if="status.kind === 'err'"
        class="text-sm text-skin-danger break-all"
      >
        {{ status.message }}
      </span>
    </div>
    <div
      v-if="status.kind === 'ok'"
      class="text-sm flex items-center gap-1"
      :class="
        status.ballots.aggregateMatches
          ? 'text-skin-success'
          : 'text-skin-danger'
      "
    >
      <IH-check-circle
        v-if="status.ballots.aggregateMatches"
        class="size-[16px] shrink-0"
      />
      <IH-x-circle v-else class="size-[16px] shrink-0" />
      <!-- With no votes, the committee publishes an empty (identity) aggregate.
           Say so plainly instead of reporting a "match". -->
      <span
        v-if="
          status.ballots.contributing === 0 && status.ballots.aggregateMatches
        "
      >
        No votes were cast; the published aggregate is empty, as expected.
      </span>
      <!-- No counted ballots but a non-empty aggregate: the ballot list served by
           the hub cannot produce the published aggregate. -->
      <span v-else-if="status.ballots.contributing === 0">
        No votes were cast, but the published aggregate is NOT empty.
      </span>
      <span v-else>
        {{ status.ballots.contributing }} ballots aggregated{{
          exclusionSummary ? ' (the ones the committee admitted)' : ''
        }}; the recomputed total
        {{ status.ballots.aggregateMatches ? 'matches' : 'does NOT match' }}
        the one the keypers decrypted.
      </span>
    </div>
    <!-- The committee admitted a ballot the hub did not return, so the hub and
         the committee disagree on which ballots exist. -->
    <div
      v-if="status.kind === 'ok' && !status.ballots.admittedSetResolved"
      class="text-sm text-skin-danger flex items-center gap-1"
    >
      <IH-exclamation-circle class="size-[16px] shrink-0" />
      <span>
        The published aggregate counts ballots the hub did not return. The two
        do not agree on which ballots exist, so this recomputation is
        incomplete.
      </span>
    </div>
    <div
      v-if="status.kind === 'ok'"
      class="text-sm flex items-center gap-1"
      :class="status.scoresAgree ? 'text-skin-success' : 'text-skin-danger'"
    >
      <IH-check-circle v-if="status.scoresAgree" class="size-[16px] shrink-0" />
      <IH-x-circle v-else class="size-[16px] shrink-0" />
      <span>
        The totals
        {{ status.scoresAgree ? 'match' : 'do NOT match' }}
        the proposal's published results.
      </span>
    </div>
    <div
      v-if="exclusionSummary"
      class="text-sm text-skin-text border-l-2 border-skin-border pl-2"
    >
      <div>
        The committee excluded {{ exclusionSummary.count }}
        {{ exclusionSummary.count === 1 ? 'ballot' : 'ballots' }} from the
        tally. This is expected behaviour, not a verification failure — the
        totals above are over the ballots it admitted.
      </div>
      <div class="text-skin-link">
        <span v-for="(r, i) in exclusionSummary.reasons" :key="r.reason"
          >{{ i ? ', ' : '' }}{{ r.count }} × {{ r.reason }}</span
        >
      </div>
    </div>
    <div
      v-if="scaledToZeroSummary"
      class="text-sm text-skin-text border-l-2 border-skin-border pl-2"
    >
      <div>
        {{ scaledToZeroSummary.count }}
        {{ scaledToZeroSummary.count === 1 ? 'ballot' : 'ballots' }}
        {{ scaledToZeroSummary.count === 1 ? 'was' : 'were' }} admitted but
        {{ scaledToZeroSummary.count === 1 ? 'rounds' : 'round' }} to zero at
        this proposal's scale of
        <span
          class="text-skin-link"
          v-text="scaledToZeroSummary.scale.toLocaleString()"
        />.
        {{ scaledToZeroSummary.count === 1 ? 'It held' : 'Together they held' }}
        <span
          class="text-skin-link"
          v-text="scaledToZeroSummary.held.toLocaleString()"
        />, which is not reflected in the totals below.
      </div>
      <div>
        Scaling divides every voter's power by the same amount, so the
        proportions between them are unchanged. It applies only when a space's
        total supply would otherwise put the tally beyond what the committee's
        coordinator can compute.
      </div>
    </div>

    <ul
      v-if="status.kind === 'ok'"
      class="text-sm text-skin-text grid grid-cols-2 gap-x-4"
    >
      <li
        v-for="(tally, i) in status.tallies"
        :key="i"
        class="flex justify-between"
      >
        <span class="truncate">
          {{ proposal.choices?.[i] || `Choice ${i + 1}` }}
        </span>
        <span class="font-mono">{{ formatTally(tally) }}</span>
      </li>
    </ul>

    <!-- Engine room: progressive-disclosure cryptographic detail. -->
    <div v-if="status.kind === 'ok'" class="pt-1">
      <button
        type="button"
        class="text-sm text-skin-link flex items-center gap-1"
        @click="showDetail = !showDetail"
      >
        <IH-chevron-right
          class="size-[16px] transition-transform"
          :class="{ 'rotate-90': showDetail }"
        />
        {{ showDetail ? 'Hide' : 'Show' }} cryptographic detail
      </button>

      <div v-if="showDetail" class="mt-2 space-y-3">
        <!-- Stage 1: homomorphic aggregate. -->
        <div class="border rounded-lg px-3 py-2">
          <div
            class="flex items-center gap-2 text-skin-link font-semibold text-sm"
          >
            <span
              class="inline-flex items-center justify-center size-[18px] rounded-full bg-skin-border text-xs"
              >1</span
            >
            Homomorphic aggregate
            <IH-check-circle
              v-if="status.ballots.aggregateMatches"
              class="size-[15px] text-skin-success"
            />
            <IH-x-circle v-else class="size-[15px] text-skin-danger" />
          </div>
          <div class="text-xs text-skin-text mt-1">
            Adding all encrypted ballots (each scaled by its voting power)
            yields one encrypted total per choice, without decrypting anyone's
            vote. The recomputed aggregate
            {{ status.ballots.aggregateMatches ? 'matches' : 'does NOT match' }}
            the bytes the keypers decrypted.
          </div>
          <div class="text-xs mt-2 flex justify-between">
            <span class="text-skin-text">Aggregate fingerprint</span>
            <span class="font-mono">{{ aggregateFingerprint }}</span>
          </div>
        </div>

        <!-- Stage 2: threshold decryption. -->
        <div class="border rounded-lg px-3 py-2">
          <div
            class="flex items-center gap-2 text-skin-link font-semibold text-sm"
          >
            <span
              class="inline-flex items-center justify-center size-[18px] rounded-full bg-skin-border text-xs"
              >2</span
            >
            Threshold decryption
            <!-- Reached only when every candidate has a quorum of shares. -->
            <IH-check-circle class="size-[15px] text-skin-success" />
          </div>
          <div class="text-xs text-skin-text mt-1">
            Only the combined total is decrypted, and only when at least
            {{ status.audit.te_threshold_t }} of
            {{ status.audit.te_threshold_n }} keypers cooperate. Each keyper's
            decryption share carries a DLEQ (Chaum–Pedersen) proof that it was
            computed with the same secret key it committed to at setup; the
            recovery below rejects any share whose proof fails.
          </div>
          <div class="text-xs mt-2 flex justify-between">
            <span class="text-skin-text">Master public key</span>
            <span class="font-mono">{{ mpkFingerprint }}</span>
          </div>
          <div class="text-xs mt-1 flex justify-between">
            <span class="text-skin-text">Threshold</span>
            <span class="font-mono">
              {{ status.audit.te_threshold_t }}-of-{{
                status.audit.te_threshold_n
              }}
            </span>
          </div>
          <ul class="mt-2 space-y-1">
            <li
              v-for="row in keyperRows"
              :key="row.index"
              class="flex items-center justify-between text-xs gap-2"
            >
              <span class="flex items-center gap-1 truncate">
                <IH-check-circle
                  class="size-[14px] text-skin-success shrink-0"
                />
                Keyper {{ row.index }}
                <span
                  v-if="row.address"
                  class="font-mono text-skin-text truncate"
                >
                  {{ shortenAddress(row.address) }}
                </span>
              </span>
              <span class="text-skin-text shrink-0">
                {{ row.shares }}/{{ numCandidates }} shares
              </span>
            </li>
          </ul>
        </div>

        <button
          type="button"
          class="text-sm border rounded-lg px-3 py-1.5 hover:bg-skin-border flex items-center gap-1"
          @click="downloadBundle"
        >
          <IH-arrow-down-tray class="size-[15px]" />
          Download verification bundle
        </button>
      </div>
    </div>
  </div>
</template>
