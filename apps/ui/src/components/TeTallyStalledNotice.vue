<script setup lang="ts">
/**
 * "This tally stalled", and the admin's way out of it.
 *
 * A stall means the keyper committee could not finish the count and the coordinator
 * gave up. It is recoverable but deliberately **not** self-healing: the flag is
 * persisted, so restarting the coordinator does not resume the election. Someone has
 * to look at why it failed and decide to retry — which is exactly what this button
 * is, signed by the one wallet the hub accepts for the clearing direction.
 *
 * On the wording: the hub stores a boolean, not a reason. The coordinator knows
 * whether it gave up because keypers were unreachable, because they derived
 * different aggregates, or because it ran past its deadline, but it does not send
 * that along. So the notice names all three possibilities rather than asserting one
 * — telling an operator "the keypers are offline" when they in fact disagreed would
 * send them to restart healthy machines.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { fetchGegElection, submitTallyResume } from '@/helpers/teStall';
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
 * The coordinator's own account of the stall, when it gave one.
 *
 * Unsigned, unlike the stall flag beside it — the hub records it verbatim and
 * nothing verifies it. Rendered as the coordinator's claim rather than as fact,
 * and it drives nothing: the retry button is gated on an admin signature exactly
 * as before, whatever this says.
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
    const state = await fetchGegElection(props.apiBaseUrl, props.proposal.id);
    stalled.value = state.tallyStalled;
    stallReason.value = state.tallyStallReason;
  } catch {
    // Transient: the notice is an aid, not a source of truth. Leaving the last
    // known state in place beats flickering it away on one failed poll.
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
  // So the notice clears itself once the retry lands and the tally completes.
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
    <!-- Deliberately no <p> here. Tune styles the bare element at 22px with its own
         padding, which beats a size class on this wrapper and made the copy render
         larger than the sibling result notices. The rest of the app avoids <p> in
         cards for the same reason. -->
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
