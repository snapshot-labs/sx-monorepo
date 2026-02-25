<script setup lang="ts">
import { _n } from '@/helpers/utils';
import { Network } from '@/networks/types';
import { useRelayerInfoQuery } from '@/queries/relayerInfo';
import { Space } from '@/types';

const props = defineProps<{
  space: Space;
  network: Network;
}>();

const isAddressModalOpen = ref(false);

const {
  data: relayerInfo,
  isPending,
  isError
} = useRelayerInfoQuery(toRef(() => props.space));
</script>

<template>
  <div>
    <UiEyebrow class="font-medium mt-4 mb-2">Relayer Balance</UiEyebrow>
    <div
      class="flex justify-between items-center rounded-lg border px-4 py-3 gap-3 text-skin-link"
    >
      <div v-if="isPending" class="flex flex-col">
        <UiLoading class="text-skin-text" :size="16" :loading="true" />
      </div>
      <UiStateWarning v-else-if="isError || !relayerInfo">
        Failed to load relayer balance.
      </UiStateWarning>
      <template v-else>
        <AppLink
          :to="network.helpers.getExplorerUrl(relayerInfo.address, 'address')"
          class="flex items-center gap-3 truncate"
        >
          <UiBadgeNetwork :chain-id="network.chainId" class="hidden sm:block">
            <UiStamp
              :id="relayerInfo.address"
              type="avatar"
              :size="32"
              class="rounded-md"
            />
          </UiBadgeNetwork>
          <div class="leading-[22px] truncate">
            <h4 class="text-skin-link truncate">
              {{
                _n(relayerInfo.balance, 'standard', {
                  maximumFractionDigits: 6
                })
              }}
              {{ relayerInfo.ticker }}
            </h4>
            <UiAddress
              class="text-skin-text text-[17px]"
              :address="relayerInfo.address"
            />
          </div>
        </AppLink>
        <UiTooltip title="Deposit" class="shrink-0">
          <UiButton uniform @click="isAddressModalOpen = true">
            <IH-qrcode />
          </UiButton>
        </UiTooltip>
      </template>
    </div>
    <teleport to="#modal">
      <ModalDeposit
        v-if="relayerInfo"
        :open="isAddressModalOpen"
        :address="relayerInfo.address"
        :chain-id="network.chainId"
        @close="isAddressModalOpen = false"
      />
    </teleport>
  </div>
</template>
