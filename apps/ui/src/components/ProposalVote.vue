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

const { auth } = useWeb3();
const { votes, pendingVotes } = useAccount();
const { getTsFromCurrent } = useMetaStore();
const { isInvalidNetwork } = useSafeWallet(
  props.proposal.network,
  props.proposal.space.snapshot_chain_id
);

const start = getTsFromCurrent(props.proposal.network, props.proposal.start);

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
  // Always allow voting for local proposals
  if (props.proposal.id.startsWith('local-')) {
    return true;
  }

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
</script>

<template>
  <slot v-if="currentVote && !editMode" name="voted" :vote="currentVote">
    <UiButton
      class="!h-[48px] text-left w-full flex items-center justify-between rounded-lg space-x-2"
      :class="{
        'border-skin-link': isEditable
      }"
      :disabled="!isEditable"
      @click="$emit('enterEditMode')"
    >
      <div
        v-if="
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
  <slot
    v-else-if="
      proposal.state === 'pending' && !proposal.id.startsWith('local-')
    "
    name="waiting"
  >
    Voting for this proposal hasn't started yet. Voting will start
    {{ _t(start) }}.
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
  <slot v-else-if="isInvalidNetwork" name="wrong-safe-network">
    Safe's network should be same as space's network
  </slot>
  <div v-else>
    <slot />
  </div>
</template>
