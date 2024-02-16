<script setup lang="ts">
import { SUPPORTED_VOTING_TYPES } from '@/helpers/constants';
import { _t } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { Proposal as ProposalType } from '@/types';

const props = defineProps<{ proposal: ProposalType }>();

const uiStore = useUiStore();
const { votes } = useAccount();
const { getTsFromCurrent } = useMetaStore();

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
  <slot v-else></slot>
</template>
