<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { _n, shorten } from '@/helpers/utils';
import { Network } from '@/networks/types';
import { Space } from '@/types';

type RelayerInfo = {
  address: string;
  balance: number;
  ticker: string;
  hasMinimumBalance: boolean;
};

const props = defineProps<{
  space: Space;
  network: Network;
}>();

const {
  data: relayerInfo,
  isPending,
  isError
} = useQuery({
  queryKey: [
    'relayerBalance',
    () => ({
      spaceId: props.space.id,
      networkId: props.space.network
    })
  ],
  queryFn: async () => {
    return props.network.helpers.getRelayerInfo(
      props.space.id,
      props.space.network
    ) as Promise<RelayerInfo>;
  },
  staleTime: Infinity
});
</script>

<template>
  <div>
    <h4 class="eyebrow mt-4 mb-2 font-medium">Relayer Balance</h4>
    <div
      class="flex justify-between items-center rounded-lg border px-4 py-3 text-skin-link"
    >
      <div v-if="isPending" class="flex flex-col">
        <UiLoading class="text-skin-text" :size="16" :loading="true" />
      </div>
      <div
        v-else-if="isError || !relayerInfo"
        class="flex items-center text-skin-link space-x-2"
      >
        <IH-exclamation-circle class="inline-block shrink-0" />
        <span>Failed to load relayer balance.</span>
      </div>
      <template v-else>
        <div class="flex flex-col">
          <a
            :href="
              network.helpers.getExplorerUrl(relayerInfo.address, 'address')
            "
            target="_blank"
            class="flex items-center text-skin-text leading-5"
          >
            <UiStamp
              :id="relayerInfo.address"
              type="avatar"
              :size="18"
              class="mr-2 !rounded"
            />
            {{ shorten(relayerInfo.address) }}
            <IH-arrow-sm-right class="-rotate-45" />
          </a>
        </div>
        <div class="flex items-center">
          {{
            _n(relayerInfo.balance, 'standard', { maximumFractionDigits: 6 })
          }}
          {{ relayerInfo.ticker }}
        </div>
      </template>
    </div>
  </div>
</template>
