<script setup lang="ts">
import networks from '@snapshot-labs/snapshot.js/src/networks.json';
import { SUPPORTED_VOTING_TYPES } from '@/helpers/constants';
import { _t, getChoiceText, getEncryptedChoicePreview } from '@/helpers/utils';
import { getNetwork, offchainNetworks } from '@/networks';
import { Proposal as ProposalType } from '@/types';

const props = withDefaults(
  defineProps<{ proposal: ProposalType; editMode?: boolean }>(),
  {
    editMode: false
  }
);

defineEmits<{
  (e: 'enterEditMode'): void;
}>();

const { auth } = useWeb3();
const { votes, pendingVotes } = useAccount();
const { isInvalidNetwork } = useSafeWallet(
  props.proposal.network,
  props.proposal.space.snapshot_chain_id
);

const hasSupportedAuthenticator = computed(() => {
  const network = getNetwork(props.proposal.network);

  return props.proposal.space.authenticators.some(authenticator => {
    const supportInfo =
      network.helpers.getAuthenticatorSupportInfo(authenticator);

    return supportInfo?.isSupported;
  });
});

const isConnectorSupported = computed(() => {
  if (!auth.value) return true;
  const currentConnector = auth.value.connector.type;

  const network = getNetwork(props.proposal.network);

  return props.proposal.space.authenticators.some(authenticator => {
    const supportInfo =
      network.helpers.getAuthenticatorSupportInfo(authenticator);

    return (
      supportInfo?.isSupported &&
      supportInfo?.connectors.includes(currentConnector)
    );
  });
});

const isSupported = computed(() => {
  const network = getNetwork(props.proposal.network);

  const hasSupportedStrategies = props.proposal.strategies.find(strategy =>
    network.helpers.isStrategySupported(strategy)
  );

  return (
    hasSupportedAuthenticator.value &&
    isConnectorSupported.value &&
    hasSupportedStrategies &&
    SUPPORTED_VOTING_TYPES.includes(props.proposal.type)
  );
});

const currentVote = computed(
  () => votes.value[`${props.proposal.network}:${props.proposal.id}`]
);

const isEditable = computed(() => {
  return (
    currentVote.value &&
    offchainNetworks.includes(props.proposal.network) &&
    props.proposal.state === 'active'
  );
});

const showBallotInfo = ref(false);

const isShutterElgamal = computed(
  () => props.proposal.privacy === 'shutter-elgamal'
);

// DKG permanently failed — all retry attempts exhausted.
const dkgFailed = computed(
  () => isShutterElgamal.value && props.proposal.te_dkg_status === 'dkg_failed'
);

// DKG still running — no key yet and not permanently failed.
// Includes pending: with MIN_DKG_LEAD_TIME, DKG runs before the proposal starts.
const dkgInProgress = computed(
  () =>
    isShutterElgamal.value &&
    ['pending', 'active'].includes(props.proposal.state) &&
    !props.proposal.te_mpk &&
    !dkgFailed.value
);
</script>

<template>
  <slot v-if="currentVote && !editMode" name="voted" :vote="currentVote">
    <UiButton
      class="text-left w-full !justify-between"
      :size="48"
      :class="{
        'border-skin-link': isEditable
      }"
      :disabled="!isEditable"
      @click="$emit('enterEditMode')"
    >
      <div
        v-if="proposal.privacy === 'shutter-elgamal'"
        class="flex space-x-2 items-center grow truncate text-skin-link"
      >
        <IH-lock-closed class="size-[16px] shrink-0" />
        <span class="font-mono truncate">
          {{ getEncryptedChoicePreview(currentVote.choice) }}
        </span>
      </div>
      <div
        v-else-if="
          proposal.privacy !== 'none' &&
          ['pending', 'active'].includes(proposal.state)
        "
        class="flex space-x-2 items-center grow truncate text-skin-link"
      >
        <IH-lock-closed class="size-[16px] shrink-0" />
        <span class="truncate">Encrypted choice</span>
      </div>
      <div v-else class="flex items-center gap-2 overflow-hidden">
        <div
          v-if="proposal.type === 'basic'"
          class="shrink-0 rounded-full choice-bg inline-block size-[18px]"
          :class="`_${currentVote.choice}`"
        >
          <IH-check
            v-if="currentVote.choice === 1"
            class="text-white size-[14px] mt-0.5 ml-0.5"
          />
          <IH-x
            v-else-if="currentVote.choice === 2"
            class="text-white size-[14px] mt-0.5 ml-0.5"
          />
          <IH-minus-sm
            v-else-if="currentVote.choice === 3"
            class="text-white size-[14px] mt-0.5 ml-0.5"
          />
        </div>
        <div
          class="grow truncate text-skin-link"
          v-text="getChoiceText(proposal.choices, currentVote.choice)"
        />
      </div>
      <IH-pencil v-if="isEditable" class="shrink-0" />
    </UiButton>
    <div v-if="proposal.privacy === 'shutter-elgamal'" class="mt-1.5">
      <button
        type="button"
        class="flex items-center gap-1.5 text-sm text-skin-text"
        @click="showBallotInfo = !showBallotInfo"
      >
        <IH-shield-check class="size-[15px] shrink-0" />
        <span>Encrypted in your browser</span>
        <IH-chevron-right
          class="size-[14px] shrink-0 transition-transform"
          :class="{ 'rotate-90': showBallotInfo }"
        />
      </button>
      <div v-if="showBallotInfo" class="text-sm text-skin-text mt-1 pl-[22px]">
        Your choice was encrypted to this proposal's threshold key before it was
        sent. The server only ever stores the ciphertext above, never your
        selection, and it stays sealed until voting closes.
      </div>
    </div>
  </slot>
  <slot
    v-else-if="
      !isEditable &&
      pendingVotes[proposal.id] &&
      !offchainNetworks.includes(props.proposal.network)
    "
    name="voted-pending"
  >
    You have already voted for this proposal
  </slot>
  <slot v-else-if="dkgFailed" name="dkg-failed">
    <div
      class="border border-red-500/40 rounded-lg px-3 py-4 flex flex-col items-center text-center gap-2"
    >
      <IH-x-circle class="size-[36px] text-red-500 shrink-0" />
      <div class="text-red-500 font-semibold">Encryption setup failed</div>
      <div class="text-sm text-skin-text max-w-[320px]">
        The keypers could not complete distributed key generation for this
        proposal. Voting is disabled. Please contact the space administrator.
      </div>
    </div>
  </slot>
  <div
    v-else-if="dkgInProgress"
    class="border rounded-lg px-3 py-4 flex flex-col items-center text-center gap-2"
  >
    <div class="relative size-[44px]">
      <span
        class="absolute inset-0 rounded-full border-2 border-skin-border border-t-skin-link animate-spin"
      />
      <IH-key
        class="size-[20px] text-skin-link absolute inset-0 m-auto animate-pulse"
      />
    </div>
    <div class="text-skin-link font-semibold">Generating encryption keys</div>
    <div class="text-sm text-skin-text max-w-[320px]">
      The keypers are running distributed key generation for this proposal.
      Voting opens as soon as the shared key is published, usually within a few
      seconds. Hang tight so your ballot can be encrypted.
    </div>
    <button
      type="button"
      disabled
      class="mt-1 w-full rounded-lg border px-3 py-2.5 text-skin-text bg-skin-border/40 cursor-not-allowed flex items-center justify-center gap-2"
    >
      <UiLoading class="shrink-0" />
      Preparing secure ballot...
    </button>
  </div>

  <slot v-else-if="proposal.state === 'pending'" name="waiting">
    Voting for this proposal hasn't started yet. Voting will start
    {{ _t(proposal.start) }}.
  </slot>

  <slot
    v-else-if="
      ['passed', 'rejected', 'queued', 'vetoed', 'executed'].includes(
        proposal.state
      )
    "
    name="ended"
  >
    Proposal voting window has ended
  </slot>

  <slot v-else-if="proposal.cancelled" name="cancelled"
    >This proposal has been cancelled</slot
  >

  <slot v-else-if="!isSupported" name="unsupported">
    <template v-if="!isConnectorSupported">
      This space does not support your connected wallet
    </template>
    <template v-else>Voting for this proposal is not supported</template>
  </slot>
  <slot
    v-else-if="proposal.space.snapshot_chain_id && isInvalidNetwork"
    name="wrong-safe-network"
  >
    Please use a Safe on
    {{ networks[proposal.space.snapshot_chain_id]?.name ?? 'space network' }} to
    vote.
  </slot>
  <div v-else>
    <slot />
  </div>
</template>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  .animate-spin,
  .animate-pulse {
    animation: none;
  }
}
</style>
