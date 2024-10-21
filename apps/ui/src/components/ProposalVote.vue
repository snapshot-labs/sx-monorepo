<script setup lang="ts">
import { SUPPORTED_VOTING_TYPES } from '@/helpers/constants';
import { _t, getChoiceText } from '@/helpers/utils';
import { getNetwork, offchainNetworks } from '@/networks';
import { Proposal as ProposalType } from '@/types';

const props = withDefaults(
  defineProps<{ proposal: ProposalType; editMode?: boolean }>(),
  {
    editMode: false
  }
);

defineEmits<{
  (e: 'enterEditMode');
}>();

const { votes, pendingVotes } = useAccount();
const { getTsFromCurrent } = useMetaStore();
const { isInvalidNetwork } = useSafeWallet(
  props.proposal.network,
  props.proposal.space.snapshot_chain_id
);

const start = getTsFromCurrent(props.proposal.network, props.proposal.start);

const isSupported = computed(() => {
  const network = getNetwork(props.proposal.network);

  const hasSupportedAuthenticator = props.proposal.space.authenticators.find(
    authenticator => network.helpers.isAuthenticatorSupported(authenticator)
  );
  const hasSupportedStrategies = props.proposal.strategies.find(strategy =>
    network.helpers.isStrategySupported(strategy)
  );

  return (
    hasSupportedAuthenticator &&
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
</script>

<template>
  <slot v-if="currentVote && !editMode" name="voted" :vote="currentVote">
    <div v-bind="$attrs">
      <UiButton
        class="!h-[48px] text-left w-full flex items-center rounded-lg space-x-2"
        :disabled="!isEditable"
        @click="$emit('enterEditMode')"
      >
        <div
          v-if="proposal.privacy"
          class="flex space-x-2 items-center grow truncate"
          :class="{ 'text-skin-text': !isEditable }"
        >
          <IH-lock-closed class="size-[16px] shrink-0" />
          <span class="truncate">Encrypted choice</span>
        </div>
        <div
          v-else
          class="grow truncate"
          :class="{ 'text-skin-text': !isEditable }"
          v-text="getChoiceText(proposal.choices, currentVote.choice)"
        />
        <IH-pencil v-if="isEditable" class="shrink-0" />
      </UiButton>
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
  <slot v-else-if="proposal.state === 'pending'" name="waiting">
    Voting for this proposal hasn't started yet. Voting will start
    {{ _t(start) }}.
  </slot>

  <slot
    v-else-if="['passed', 'rejected', 'executed'].includes(proposal.state)"
    name="ended"
  >
    Proposal voting window has ended
  </slot>

  <slot v-else-if="proposal.cancelled" name="cancelled"
    >This proposal has been cancelled</slot
  >

  <slot v-else-if="!isSupported" name="unsupported">
    Voting for this proposal is not supported
  </slot>
  <slot v-else-if="isInvalidNetwork" name="wrong-safe-network">
    Safe's network should be same as space's network
  </slot>
  <div v-else v-bind="$attrs">
    <slot />
  </div>
</template>
