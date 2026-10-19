<script setup lang="ts">
/**
 * Shows a stalled tally and lets an admin retry it.
 *
 * A stall means the keyper committee could not finish the count and the coordinator
 * gave up. The flag is stored, so restarting the coordinator does not resume the
 * tally; an admin must retry it with a wallet signature.
 *
 * The stall flag does not say which of the three causes happened, so the notice
 * lists all three. The coordinator's optional reason is shown separately, as its
 * claim.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { fetchSgpElection, submitTallyResume } from '@/helpers/teStall';
import { shortenAddress } from '@/helpers/utils';
import { Proposal } from '@/types';

const props = defineProps<{
  proposal: Proposal;
  /** Hub root, ending in `/api` (e.g. `https://hub.snapshot.org/api`). */
  apiBaseUrl: string;
}>();

const { auth, web3 } = useWeb3();

const stalled = ref(false);
/**
 * The coordinator's reason for the stall, if it gave one. It is not signed or
 * verified, so it is shown as the coordinator's claim and affects nothing else.
 */
const stallReason = ref<string | null>(null);
const busy = ref(false);
const message = ref<{ kind: 'ok' | 'err'; text: string } | null>(null);

let timer: ReturnType<typeof setInterval> | undefined;

const account = computed(() => web3.value.account || '');

/**
 * Who may retry: an admin of the proposal's space, falling back to its author when
 * the space lists none.
 */
const authorities = computed(() => {
  const admins = (props.proposal.space?.admins || []).filter(Boolean);
  return admins.length ? admins : [props.proposal.author?.id].filter(Boolean);
});

const isAdmin = computed(
  () =>
    !!account.value &&
    authorities.value.some(a => a.toLowerCase() === account.value.toLowerCase())
);

async function refresh() {
  try {
    const state = await fetchSgpElection(props.apiBaseUrl, props.proposal.id);
    stalled.value = state.tallyStalled;
    stallReason.value = state.tallyStallReason;
  } catch {
    // Keep the last known state rather than hiding the notice on one failed poll.
  }
}

async function retry() {
  if (!auth.value) return;
  busy.value = true;
  message.value = null;
  try {
    const signer = auth.value.provider.getSigner();
    await submitTallyResume(props.apiBaseUrl, props.proposal.id, digest =>
      signer.signMessage(digest)
    );
    message.value = {
      kind: 'ok',
      text: 'Retry requested. The committee will be asked again on the next poll.'
    };
    await refresh();
  } catch (err: any) {
    message.value = { kind: 'err', text: err?.message || String(err) };
  } finally {
    busy.value = false;
  }
}

onMounted(() => {
  refresh();
  // Poll so the notice clears itself once the retried tally completes.
  timer = setInterval(refresh, 15_000);
});

onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <div
    v-if="stalled"
    class="border border-skin-danger rounded-lg px-3 py-2.5 mt-2.5 space-y-2"
  >
    <div class="flex items-center gap-2 text-skin-danger font-semibold">
      <IH-exclamation class="size-[18px] shrink-0" />
      Tally stalled
    </div>
    <!-- No <p> here: Tune styles bare <p> at 22px with its own padding, which
         overrides the size class on this wrapper. -->
    <div class="text-skin-text text-base space-y-1">
      <div>
        The keyper committee could not complete this count, so no result has
        been published. The votes are unharmed and still encrypted — this can be
        retried.
      </div>
      <div>Any of three things can cause it:</div>
      <ul class="list-disc pl-5 space-y-0.5">
        <li>not enough keypers responded to reach the quorum;</li>
        <li>the keypers responded but derived different totals;</li>
        <li>the count did not finish in the time the coordinator allows.</li>
      </ul>
      <div v-if="stallReason" class="break-words">
        The coordinator reports:
        <span class="font-semibold">{{ stallReason }}</span>
      </div>
    </div>
    <div v-if="isAdmin" class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="border rounded-lg px-3 py-1.5 hover:bg-skin-border"
        :disabled="busy"
        @click="retry"
      >
        {{ busy ? 'Awaiting signature...' : 'Retry tally' }}
      </button>
      <span class="text-skin-text text-base">
        Signs a retry with your wallet. Bring the keypers back first.
      </span>
    </div>
    <div v-else class="text-skin-text text-base">
      Retrying is restricted to this space's admins<span
        v-if="authorities.length"
      >
        ({{ authorities.map(a => shortenAddress(a)).join(', ') }})</span
      >.
      <span v-if="!account">Connect that wallet to retry.</span>
    </div>
    <div
      v-if="message"
      class="text-sm break-all"
      :class="message.kind === 'ok' ? 'text-skin-success' : 'text-skin-danger'"
    >
      {{ message.text }}
    </div>
  </div>
</template>
