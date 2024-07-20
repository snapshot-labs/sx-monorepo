<script setup lang="ts">
import { SUPPORTED_VOTING_TYPES } from '@/helpers/constants';
import { _t, getChoiceText } from '@/helpers/utils';
import { getNetwork, offchainNetworks } from '@/networks';
import { Proposal as ProposalType } from '@/types';

const props = defineProps<{ proposal: ProposalType }>();

const { votes, pendingVotes } = useAccount();
const { getTsFromCurrent } = useMetaStore();
const { isInvalidNetwork } = useSafeWallet(
  props.proposal.network,
  props.proposal.space.snapshot_chain_id
);

const editMode = ref(false);

const start = getTsFromCurrent(props.proposal.network, props.proposal.start);

const isSupported = computed(() => {
  const network = getNetwork(props.proposal.network);

  const hasSupportedAuthenticator = props.proposal.space.authenticators.find(authenticator =>
    network.helpers.isAuthenticatorSupported(authenticator)
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

const isEditable = computed(() => {
  return (
    !!votes.value[`${props.proposal.network}:${props.proposal.id}`] &&
    offchainNetworks.includes(props.proposal.network) &&
    props.proposal.state === 'active'
  );
});

function handleEditVoteClick() {
  if (!isEditable.value) return;

  editMode.value = true;
}
</script>

<template>
  <slot
    v-if="votes[`${proposal.network}:${proposal.id}`] && !editMode"
    name="voted"
    :vote="votes[`${proposal.network}:${proposal.id}`]"
  >
    <UiButton
      class="!h-[48px] text-left w-full flex items-center rounded-lg space-x-2 cursor-default"
      :class="{ 'border-skin-link cursor-pointer': isEditable }"
      @click="handleEditVoteClick()"
    >
      <div class="grow truncate">
        {{ getChoiceText(proposal.choices, votes[`${proposal.network}:${proposal.id}`].choice) }}
      </div>
      <IH-pencil v-if="isEditable" class="shrink-0" />
    </UiButton>
  </slot>

  <slot v-else-if="pendingVotes[proposal.id]" name="voted-pending">
    This vote is pending confirmation
  </slot>
  <slot v-else-if="proposal.state === 'pending'" name="waiting">
    Voting for this proposal hasn't started yet. Voting will start {{ _t(start) }}.
  </slot>

  <slot v-else-if="['passed', 'rejected', 'executed'].includes(proposal.state)" name="ended">
    Proposal voting window has ended
  </slot>

  <slot v-else-if="proposal.cancelled" name="cancelled">This proposal has been cancelled</slot>

  <slot v-else-if="!isSupported" name="unsupported">
    Voting for this proposal is not supported
  </slot>
  <slot v-else-if="isInvalidNetwork" name="wrong-safe-network">
    Safe's network should be same as space's network
  </slot>
  <div v-else class="py-2">
    <slot />
  </div>
</template>
