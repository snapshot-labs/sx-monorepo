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
    <UiEyebrow class="mt-4 mb-2 font-medium">Relayer Balance</UiEyebrow>
    <UiRow
      justify="between"
      align="center"
      class="rounded-lg border px-4 py-3 text-skin-link"
    >
      <UiCol v-if="isPending">
        <UiLoading class="text-skin-text" :size="16" :loading="true" />
      </UiCol>
      <UiStateWarning v-else-if="isError || !relayerInfo">
        Failed to load relayer balance.
      </UiStateWarning>
      <template v-else>
        <UiCol>
          <a
            :href="
              network.helpers.getExplorerUrl(relayerInfo.address, 'address')
            "
            target="_blank"
            class="text-skin-text leading-5"
          >
            <UiRow :gap="8" align="center">
              <UiStamp
                :id="relayerInfo.address"
                type="avatar"
                :size="18"
                class="!rounded"
              />
              {{ shorten(relayerInfo.address) }}
              <IH-arrow-sm-right class="-rotate-45" />
            </UiRow>
          </a>
        </UiCol>
        <UiRow align="center">
          {{
            _n(relayerInfo.balance, 'standard', { maximumFractionDigits: 6 })
          }}
          {{ relayerInfo.ticker }}
        </UiRow>
      </template>
    </UiRow>
  </div>
</template>
