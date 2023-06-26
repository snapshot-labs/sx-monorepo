<script setup lang="ts">
import { _c } from '@/helpers/utils';
import { NetworkID } from '@/types';
import { VotingPower } from '@/networks/types';

const props = defineProps<{
  networkId: NetworkID;
  loading: boolean;
  votingPowerSymbol: string;
  votingPowers: VotingPower[];
}>();

const { web3 } = useWeb3();

const modalOpen = ref(false);

const votingPower = computed(() => props.votingPowers.reduce((acc, b) => acc + b.value, 0n));
const decimals = computed(() =>
  Math.max(...props.votingPowers.map(votingPower => votingPower.decimals), 0)
);
const formattedVotingPower = computed(() => {
  const value = _c(votingPower.value, decimals.value);

  if (props.votingPowerSymbol) {
    return `${value} ${props.votingPowerSymbol}`;
  }

  return value;
});

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
          v-if="web3.account && web3.type !== 'argentx'"
          :loading="loading"
          :class="{
            '!px-0 w-[46px]': loading
          }"
          class="flex flex-row items-center justify-center"
          @click="handleModalOpen"
        >
          <IH-lightning-bolt class="inline-block -ml-1" />
          <span class="ml-1">{{ formattedVotingPower }}</span>
        </UiButton>
      </UiTooltip>
    </slot>
    <teleport to="#modal">
      <ModalVotingPower
        :open="modalOpen"
        :network-id="networkId"
        :voting-power-symbol="votingPowerSymbol"
        :voting-powers="props.votingPowers"
        :final-decimals="decimals"
        @close="modalOpen = false"
      />
    </teleport>
  </div>
</template>
