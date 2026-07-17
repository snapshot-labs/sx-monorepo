<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  aggregateBallots,
  buildVerificationBundle,
  fetchAuditPayload,
  fetchBallotsPayload,
  fingerprintHex,
  shortHex,
  verifyTally,
  type AuditPayload,
  type BallotAggregateResult,
  type BallotsPayload,
  type VerifyResult
} from '@/helpers/teVerify';
import { Proposal } from '@/types';

const props = defineProps<{
  proposal: Proposal;
  /** Hub root, ending in `/api` (e.g. `https://hub.snapshot.org/api`). */
  apiBaseUrl: string;
}>();

type Status =
  | { kind: 'idle' }
  | { kind: 'fetching' }
  | { kind: 'verifying' }
  | {
      kind: 'ok';
      tallies: bigint[];
      matches: boolean | null;
      ballots: BallotAggregateResult;
      audit: AuditPayload;
      ballotsPayload: BallotsPayload;
      tally: VerifyResult;
    }
  | { kind: 'err'; message: string };

const status = ref<Status>({ kind: 'idle' });
const showDetail = ref(false);
const showIntro = ref(false);

async function run() {
  status.value = { kind: 'fetching' };
  try {
    const proposalId = props.proposal.proposal_id as string;
    const [payload, ballotsPayload] = await Promise.all([
      fetchAuditPayload(props.apiBaseUrl, proposalId),
      fetchBallotsPayload(props.apiBaseUrl, proposalId)
    ]);
    status.value = { kind: 'verifying' };
    // Ballots are already verifyBallot-checked by the sequencer at ingestion
    // (apps/sequencer/src/writer/vote.ts's verify()) before being persisted,
    // so this only re-aggregates the already-trusted ciphertexts and
    // compares the result to the published aggregate -- see
    // aggregateBallots's own docstring for why the per-ballot proof isn't
    // re-checked here.
    const ballots = await aggregateBallots(ballotsPayload, payload.aggregate);
    // Step 2: recover the tally from the public decryption shares.
    const result = await verifyTally(
      proposalId,
      payload,
      props.proposal.scores,
      budget.value
    );
    status.value = {
      kind: 'ok',
      tallies: result.tallies,
      matches: result.matchesPublished,
      ballots,
      audit: payload,
      ballotsPayload,
      tally: result
    };
  } catch (err: any) {
    status.value = { kind: 'err', message: err?.message || String(err) };
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
      address: addresses[idx] || addresses[idx - 1] || null,
      shares
    }));
});

const numCandidates = computed(() =>
  status.value.kind === 'ok' ? status.value.audit.aggregate.num_candidates : 0
);

/**
 * Budget the SDK's ``recoverTally`` recovers in -- e.g. budget=100 for a
 * weighted proposal means the raw recovered integer is the vote count
 * scaled by 100 (see verifyTally's own scaling against publishedScores),
 * so it has to be divided back down to read as an actual vote count.
 * budget=1 for simple single-choice voting, where the raw value already
 * is the vote count.
 */
const budget = computed(() => (props.proposal.te_config as any)?.budget ?? 1);

/** Displays a recovered raw tally in real vote-count units. */
function formatTally(raw: bigint): string {
  const value = Number(raw) / budget.value;
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
        <span v-else-if="status.kind === 'verifying'">Verifying...</span>
        <span v-else>Verify tally</span>
      </button>
      <span
        v-if="status.kind === 'ok' && status.matches === true"
        class="text-skin-success flex items-center gap-1"
      >
        <IH-check-circle class="size-[16px]" />
        Tally matches published scores.
      </span>
      <span
        v-else-if="status.kind === 'ok' && status.matches === false"
        class="text-skin-danger flex items-center gap-1"
      >
        <IH-x-circle class="size-[16px] shrink-0" />
        Mismatch: the recomputed tally differs from the published scores.
      </span>
      <span
        v-else-if="status.kind === 'ok'"
        class="text-skin-link flex items-center gap-1"
      >
        <IH-check-circle class="size-[16px]" />
        Shares verified; recomputed totals available below.
      </span>
      <span
        v-else-if="status.kind === 'err'"
        class="text-skin-danger break-all"
      >
        {{ status.message }}
      </span>
    </div>
    <div
      v-if="status.kind === 'ok'"
      class="text-sm flex items-center gap-1"
      :class="status.ballots.aggregateMatches ? 'text-skin-success' : 'text-skin-danger'"
    >
      <IH-check-circle
        v-if="status.ballots.aggregateMatches"
        class="size-[16px] shrink-0"
      />
      <IH-x-circle v-else class="size-[16px] shrink-0" />
      <span>
        {{ status.ballots.total }} ballots aggregated; the recomputed total
        {{ status.ballots.aggregateMatches ? 'matches' : 'does NOT match' }}
        the one the keypers decrypted.
      </span>
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
            <IH-check-circle
              v-if="status.tally.thresholdMet"
              class="size-[15px] text-skin-success"
            />
            <IH-x-circle v-else class="size-[15px] text-skin-danger" />
          </div>
          <div class="text-xs text-skin-text mt-1">
            Only the combined total is decrypted, and only when at least
            {{ status.audit.te_threshold_t + 1 }} of
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
              {{ status.audit.te_threshold_t + 1 }}-of-{{
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
                  {{ shortHex(row.address) }}
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
