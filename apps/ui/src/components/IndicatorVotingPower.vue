<script setup lang="ts">
import { getFormattedVotingPower } from '@/helpers/utils';
import { evmNetworks } from '@/networks';
import { VotingPowerItem } from '@/stores/votingPowers';
import { NetworkID } from '@/types';

const props = defineProps<{
  networkId: NetworkID;
  votingPower?: VotingPowerItem;
}>();

defineEmits<{
  (e: 'fetchVotingPower');
}>();

const { web3 } = useWeb3();

const modalOpen = ref(false);

const formattedVotingPower = computed(() =>
  getFormattedVotingPower(props.votingPower)
);

const loading = computed(
  () => !props.votingPower || props.votingPower.status === 'loading'
);

function handleModalOpen() {
  modalOpen.value = true;
}
</script>

<template>
  <slot
    :voting-power="votingPower"
    :formatted-voting-power="formattedVotingPower"
    :on-click="handleModalOpen"
    v-bind="$attrs"
  >
    <UiTooltip title="Your voting power" class="flex truncate">
      <UiButton
        v-if="
          web3.account &&
          !(evmNetworks.includes(networkId) && web3.type === 'argentx')
        "
        :loading="loading"
        class="flex flex-row items-center justify-center gap-1 truncate"
        @click="handleModalOpen"
      >
        <IH-lightning-bolt class="inline-block -ml-1 shrink-0" />
        <IH-exclamation
          v-if="props.votingPower?.status === 'error'"
          class="inline-block text-rose-500"
        />
        <span v-else class="truncate">{{ formattedVotingPower }}</span>
      </UiButton>
    </UiTooltip>
  </slot>
  <teleport to="#modal">
    <ModalVotingPower
      :open="modalOpen"
      :network-id="networkId"
      :voting-power="props.votingPower"
      @close="modalOpen = false"
      @fetch-voting-power="$emit('fetchVotingPower')"
    />
  </teleport>
</template>
