<script setup lang="ts">
import { _n } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { useSpaceCreditsQuery } from '@/queries/credits';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const isDepositModalOpen = ref(false);

const network = computed(() => getNetwork(props.space.network));
const {
  data: credits,
  isPending,
  isError
} = useSpaceCreditsQuery(toRef(() => props.space));
</script>

<template>
  <div>
    <UiEyebrow class="font-medium mb-2">Balance</UiEyebrow>
    <div
      class="flex justify-between items-center rounded-lg border px-4 py-3 gap-3 text-skin-link"
    >
      <div v-if="isPending" class="flex flex-col">
        <UiLoading class="text-skin-text" :size="16" :loading="true" />
      </div>
      <UiStateWarning v-else-if="isError || !credits">
        Failed to load credits.
      </UiStateWarning>
      <template v-else>
        <AppLink
          :to="network.helpers.getExplorerUrl(credits.address, 'address')"
          class="flex items-center gap-3 truncate"
        >
          <UiBadgeNetwork :chain-id="network.chainId" class="hidden sm:block">
            <UiStamp
              :id="credits.address"
              type="avatar"
              :size="32"
              class="rounded-md"
            />
          </UiBadgeNetwork>
          <div class="leading-[22px] truncate">
            <h4 class="text-skin-link truncate">
              {{
                _n(credits.balance, 'standard', { maximumFractionDigits: 6 })
              }}
              ETH
            </h4>
            <UiAddress
              class="text-skin-text text-[17px]"
              :address="credits.address"
            />
          </div>
        </AppLink>
        <UiTooltip title="Deposit" class="shrink-0">
          <UiButton uniform @click="isDepositModalOpen = true">
            <IH-qrcode />
          </UiButton>
        </UiTooltip>
      </template>
    </div>
    <teleport to="#modal">
      <ModalDeposit
        v-if="credits"
        :open="isDepositModalOpen"
        :address="credits.address"
        :chain-id="network.chainId"
        @close="isDepositModalOpen = false"
      />
    </teleport>
  </div>
</template>
