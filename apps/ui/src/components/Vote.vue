<script setup lang="ts">
import { _t } from '@/helpers/utils';
import { useUiStore } from '@/stores/ui';
import { getNetwork } from '@/networks';
import { Proposal as ProposalType } from '@/types';

const props = defineProps<{ proposal: ProposalType }>();

const uiStore = useUiStore();
const { votes } = useAccount();

const isSupported = computed(() => {
  const network = getNetwork(props.proposal.network);

  const hasSupportedAuthenticator = props.proposal.space.authenticators.find(
    authenticator => network.constants.SUPPORTED_AUTHENTICATORS[authenticator]
  );
  const hasSupportedStrategies = props.proposal.strategies.find(
    strategy => network.constants.SUPPORTED_STRATEGIES[strategy]
  );

  return hasSupportedAuthenticator && hasSupportedStrategies;
});
</script>

<template>
  <slot
    v-if="votes[`${proposal.network}:${proposal.id}`]"
    name="voted"
    :vote="votes[`${proposal.network}:${proposal.id}`]"
  >
    You have already voted for this proposal
  </slot>

  <slot v-else-if="uiStore.pendingVotes[proposal.id]" name="voted-pending">
    You have already voted for this proposal
  </slot>
  <slot v-else-if="!proposal.has_started" name="waiting">
    Voting for this proposal hasn't started yet. Voting will start {{ _t(proposal.start) }}.
  </slot>

  <slot v-else-if="proposal.has_ended || proposal.executed" name="ended">
    Proposal voting window has ended
  </slot>

  <slot v-else-if="proposal.cancelled" name="cancelled">This proposal has been cancelled</slot>

  <slot v-else-if="!isSupported" name="unsupported">
    Voting for this proposal is not supported
  </slot>
  <slot v-else></slot>
</template>
