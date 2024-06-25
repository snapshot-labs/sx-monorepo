<script setup lang="ts">
import { _vp } from '@/helpers/utils';
import { utils } from '@snapshot-labs/sx';
import { evmNetworks } from '@/networks';
import type { NetworkID } from '@/types';
import type { VotingPower, VotingPowerStatus } from '@/networks/types';

const props = defineProps<{
  networkId: NetworkID;
  votingPower: {
    votingPowers: VotingPower[];
    status: VotingPowerStatus;
    symbol: string;
    error: utils.errors.VotingPowerDetailsError | null;
  };
}>();

defineEmits<{
  (e: 'getVotingPower');
}>();

const { web3 } = useWeb3();

const modalOpen = ref(false);

const totalVotingPower = computed(() =>
  props.votingPower.votingPowers.reduce((acc, b) => acc + b.value, 0n)
);
const decimals = computed(() =>
  Math.max(...props.votingPower.votingPowers.map(votingPower => votingPower.decimals), 0)
);
const formattedVotingPower = computed(() => {
  const value = _vp(Number(totalVotingPower.value) / 10 ** decimals.value);

  if (props.votingPower.symbol) {
    return `${value} ${props.votingPower.symbol}`;
  }

  return value;
});
const loading = computed(() => props.votingPower.status === 'loading');

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
      <UiTooltip title="Your voting power" :touch="false">
        <UiButton
          v-if="web3.account && !(evmNetworks.includes(networkId) && web3.type === 'argentx')"
          :loading="loading"
          class="flex flex-row items-center justify-center"
          :class="{
            '!px-0 w-[46px]': loading
          }"
          @click="handleModalOpen"
        >
          <IH-lightning-bolt class="inline-block -ml-1" />
          <IH-exclamation
            v-if="props.votingPower.status === 'error'"
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
        :final-decimals="decimals"
        @close="modalOpen = false"
        @get-voting-power="$emit('getVotingPower')"
      />
    </teleport>
  </div>
</template>
