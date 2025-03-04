<script setup lang="ts">
import { getFormattedVotingPower } from '@/helpers/utils';
import { evmNetworks } from '@/networks';
import { VotingPowerItem } from '@/queries/votingPower';
import { NetworkID } from '@/types';

const props = defineProps<{
  networkId: NetworkID;
  isLoading: boolean;
  isError: boolean;
  votingPower?: VotingPowerItem;
}>();

const emit = defineEmits<{
  (e: 'fetch');
}>();

const { auth } = useWeb3();

const modalOpen = ref(false);

const formattedVotingPower = computed(() =>
  getFormattedVotingPower(props.votingPower)
);

function handleModalOpen() {
  modalOpen.value = true;
}
</script>

<template>
  <slot
    v-if="
      auth &&
      !(evmNetworks.includes(networkId) && auth.connector.type === 'argentx')
    "
    :voting-power="votingPower"
    :formatted-voting-power="formattedVotingPower"
    :on-click="handleModalOpen"
    v-bind="$attrs"
  >
    <UiTooltip title="Your voting power" class="flex truncate">
      <UiButton
        :loading="isLoading"
        class="flex flex-row items-center justify-center gap-1 truncate"
        @click="handleModalOpen"
      >
        <IH-lightning-bolt class="inline-block -ml-1 shrink-0" />
        <IH-exclamation v-if="isError" class="inline-block text-rose-500" />
        <span v-else class="truncate" v-text="formattedVotingPower" />
      </UiButton>
    </UiTooltip>
  </slot>
  <teleport to="#modal">
    <ModalVotingPower
      :open="modalOpen"
      :network-id="networkId"
      :voting-power="props.votingPower"
      :is-loading="isLoading"
      :is-error="isError"
      @close="modalOpen = false"
      @fetch="emit('fetch')"
    />
  </teleport>
</template>
