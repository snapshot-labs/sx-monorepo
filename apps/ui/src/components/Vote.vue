<script setup lang="ts">
import { computed } from 'vue';
import { useAccount } from '@/composables/useAccount';
import { getNetwork } from '@/networks';
import type { Proposal as ProposalType } from '@/types';

const props = defineProps<{ proposal: ProposalType }>();

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

  <slot v-else-if="proposal.has_ended || proposal.executed" name="ended">
    Proposal voting window has ended
  </slot>

  <slot v-else-if="!isSupported" name="unsupported">
    Voting for this proposal is not supported
  </slot>
  <slot v-else></slot>
</template>
