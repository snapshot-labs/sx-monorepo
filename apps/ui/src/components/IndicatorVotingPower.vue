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
  <div>
    <slot
      :voting-power="votingPower"
      :formatted-voting-power="formattedVotingPower"
      :on-click="handleModalOpen"
    >
      <UiTooltip title="Your voting power">
        <UiButton
          v-if="
            web3.account &&
            !(evmNetworks.includes(networkId) && web3.type === 'argentx')
          "
          :loading="loading"
          class="flex flex-row items-center justify-center"
          @click="handleModalOpen"
        >
          <IH-lightning-bolt class="inline-block -ml-1" />
          <IH-exclamation
            v-if="props.votingPower?.status === 'error'"
            class="inline-block ml-1 text-rose-500"
          />
          <span v-else class="ml-1">{{ formattedVotingPower }}</span>
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
  </div>
</template>
