<script setup lang="ts">
import { _n, shorten } from '@/helpers/utils';
import { Network } from '@/networks/types';
import { useRelayerInfoQuery } from '@/queries/relayerInfo';
import { Space } from '@/types';

const props = defineProps<{
  space: Space;
  network: Network;
}>();

const {
  data: relayerInfo,
  isPending,
  isError
} = useRelayerInfoQuery(toRef(() => props.space));
</script>

<template>
  <div>
    <UiEyebrow class="mt-4 mb-2 font-medium">Relayer Balance</UiEyebrow>
    <div
      class="flex justify-between items-center rounded-lg border px-4 py-3 text-skin-link"
    >
      <div v-if="isPending" class="flex flex-col">
        <UiLoading class="text-skin-text" :size="16" :loading="true" />
      </div>
      <UiStateWarning v-else-if="isError || !relayerInfo">
        Failed to load relayer balance.
      </UiStateWarning>
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
