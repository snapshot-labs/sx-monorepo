<script setup lang="ts">
import { getNetwork } from '@/networks';
import { _n, shorten } from '@/helpers/utils';
import { NetworkID } from '@/types';
import { VotingPower, VotingPowerStatus } from '@/networks/types';

const props = defineProps<{
  open: boolean;
  networkId: NetworkID;
  votingPowerSymbol: string;
  votingPowers: VotingPower[];
  votingPowerStatus: VotingPowerStatus;
  finalDecimals: number;
}>();

defineEmits<{
  (e: 'close');
  (e: 'getVotingPower');
}>();

const network = computed(() => getNetwork(props.networkId));
const baseNetwork = computed(() =>
  network.value.baseNetworkId ? getNetwork(network.value.baseNetworkId) : network.value
);
const loading = computed(() => props.votingPowerStatus === 'loading');
const error = computed(() => props.votingPowerStatus === 'error');
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3>Your voting power</h3>
    </template>
    <UiLoading v-if="loading" class="p-4 block text-center" />
    <div v-else>
      <div v-if="error" class="p-4 flex flex-col gap-3 items-start">
        <UiAlert type="error">There was an error fetching your voting power.</UiAlert>
        <UiButton type="button" class="flex items-center gap-2" @click="$emit('getVotingPower')">
          <IH-refresh />Retry
        </UiButton>
      </div>
      <div
        v-for="(strategy, i) in votingPowers"
        :key="i"
        class="py-3 px-4 border-b last:border-b-0"
      >
        <div class="flex justify-between">
          <a
            :href="network.helpers.getExplorerUrl(strategy.address, 'strategy')"
            target="_blank"
            v-text="network.constants.STRATEGIES[strategy.address] || strategy.address"
          />
          <div class="text-skin-link">
            {{
              _n(Number(strategy.value) / 10 ** finalDecimals, 'compact', {
                maximumFractionDigits: 2,
                formatDust: true
              })
            }}
            {{ votingPowerSymbol }}
          </div>
        </div>
        <div class="flex justify-between">
          <div v-if="strategy.token" class="flex items-center gap-2">
            <a
              :href="
                baseNetwork.helpers.getExplorerUrl(strategy.token, 'contract', strategy.chainId)
              "
              target="_blank"
              class="flex items-center text-skin-text"
            >
              <UiStamp :id="strategy.token" type="avatar" :size="18" class="mr-2 rounded-sm" />
              {{ shorten(strategy.token) }}
              <IH-arrow-sm-right class="ml-1 -rotate-45" />
            </a>
            <a
              v-if="strategy.swapLink"
              :href="strategy.swapLink"
              target="_blank"
              class="flex items-center text-skin-text"
            >
              Buy
              <IH-arrow-sm-right class="ml-1 -rotate-45" />
            </a>
          </div>
          <div v-else />
          <div>
            {{ _n(Number(strategy.value) / 10 ** strategy.decimals) }}
            {{ strategy.symbol || 'units' }}
          </div>
        </div>
      </div>
    </div>
  </UiModal>
</template>
