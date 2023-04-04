<script setup lang="ts">
import { _c } from '@/helpers/utils';
import { NetworkID } from '@/types';
import { VotingPower } from '@/networks/types';

const props = defineProps<{
  networkId: NetworkID;
  loading: boolean;
  votingPowers: VotingPower[];
}>();

const { web3 } = useWeb3();

const modalOpen = ref(false);

const votingPower = computed(() => props.votingPowers.reduce((acc, b) => acc + b.value, 0n));
const decimals = computed(() =>
  Math.max(...props.votingPowers.map(votingPower => votingPower.decimals), 0)
);
</script>

<template>
  <div>
    <UiButton
      v-if="web3.account && web3.type !== 'argentx'"
      :loading="loading"
      :class="{
        '!px-0 w-[46px]': loading
      }"
      class="flex flex-row items-center justify-center"
      title="Voting power"
      @click="modalOpen = true"
    >
      <IH-lightning-bolt class="inline-block" />
      <span class="ml-1">{{ _c(votingPower, decimals) }}</span>
    </UiButton>
    <teleport to="#modal">
      <ModalVotingPower
        :open="modalOpen"
        :network-id="networkId"
        :voting-powers="props.votingPowers"
        :final-decimals="decimals"
        @close="modalOpen = false"
      />
    </teleport>
  </div>
</template>
