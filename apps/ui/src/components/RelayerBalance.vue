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

const isAddressModalOpen = ref(false);

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
    <div class="flex justify-between items-center mt-4 mb-2">
      <UiEyebrow class="font-medium">Relayer Balance</UiEyebrow>
    </div>
    <div
      class="flex flex-wrap md:flex-nowrap justify-between items-center rounded-lg border px-4 py-3 gap-3 text-skin-link"
    >
      <div v-if="isPending" class="flex flex-col">
        <UiLoading class="text-skin-text" :size="16" :loading="true" />
      </div>
      <UiStateWarning v-else-if="isError || !relayerInfo">
        Failed to load relayer balance.
      </UiStateWarning>
      <template v-else>
        <a
          :href="network.helpers.getExplorerUrl(relayerInfo.address, 'address')"
          target="_blank"
          class="flex flex-1 items-center text-skin-text"
        >
          <UiStamp
            :id="relayerInfo.address"
            type="avatar"
            :size="18"
            class="mr-2 !rounded"
          />
          {{ shorten(relayerInfo.address) }}
          <IH-arrow-sm-right class="-rotate-45 shrink-0" />
        </a>
        <div>
          {{
            _n(relayerInfo.balance, 'standard', { maximumFractionDigits: 6 })
          }}
          {{ relayerInfo.ticker }}
        </div>
        <UiButton class="w-full md:w-auto" @click="isAddressModalOpen = true">
          <IH-currency-dollar />
          Top up
        </UiButton>
      </template>
    </div>
    <teleport to="#modal">
      <ModalAddress
        v-if="relayerInfo"
        :open="isAddressModalOpen"
        :address="relayerInfo.address"
        :chain-id="network.chainId"
        title="Fund relayer account"
        @close="isAddressModalOpen = false"
      />
    </teleport>
  </div>
</template>
