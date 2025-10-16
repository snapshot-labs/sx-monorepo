<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { getIsOsnapEnabled } from '@/helpers/osnap';
import { SpaceMetadataTreasury } from '@/types';

const enableOSnap = defineModel<boolean>('enableOSnap', { required: true });

const props = defineProps<{
  isOSnapPluginEnabled: boolean;
  treasuries: SpaceMetadataTreasury[];
}>();

const {
  isPending,
  isError,
  data: oSnapAvailability
} = useQuery({
  queryKey: ['oSnapAvailability', props.treasuries],
  queryFn: async () => {
    return Promise.all(
      props.treasuries.map(async treasury => {
        if (!treasury.address || !treasury.chainId) {
          return 'UNSUPPORTED';
        }

        try {
          const isEnabled = await getIsOsnapEnabled(
            treasury.chainId as number,
            treasury.address
          );

          return isEnabled ? 'ENABLED' : 'DISABLED';
        } catch {
          console.log('chainId', treasury.chainId);
          return 'UNSUPPORTED';
        }
      })
    );
  }
});
</script>

<template>
  <h4 class="eyebrow font-medium">oSnap</h4>
  <div class="mb-2">
    oSnap uses Optimistic Governor to execute proposals on-chain.
  </div>
  <div class="s-box mt-3">
    <UiSwitch v-model="enableOSnap" title="Enable oSnap-based execution" />
  </div>
  <template v-if="isOSnapPluginEnabled && enableOSnap">
    <h4 class="eyebrow font-medium mt-3 mb-2">Treasuries</h4>
    <UiLoading v-if="isPending" />
    <div v-else-if="isError" class="flex items-center space-x-2">
      <IH-exclamation-circle class="inline-block" />
      <span>Failed to load treasuries.</span>
    </div>
    <div
      v-for="(treasury, i) in treasuries"
      v-else
      :key="treasury.address"
      class="flex justify-between items-center rounded-lg border px-4 py-3 mb-3 text-skin-link"
    >
      <div class="flex items-center">
        <div class="flex min-w-0">
          <div class="truncate mr-3">{{ treasury.name }}</div>
        </div>
      </div>
      <div class="flex gap-3">
        <div
          v-if="oSnapAvailability && oSnapAvailability[i] === 'UNSUPPORTED'"
          class="text-skin-border"
        >
          oSnap unavailable
        </div>
        <UiButton
          v-else-if="oSnapAvailability && oSnapAvailability[i] === 'ENABLED'"
          primary
          type="button"
          class="flex items-center justify-center gap-2"
        >
          <span class="block size-2 rounded-full bg-skin-success" />
          oSnap enabled
        </UiButton>
        <UiButton
          v-else-if="oSnapAvailability && oSnapAvailability[i] === 'DISABLED'"
          type="button"
          class="flex items-center justify-center gap-2"
        >
          <span class="block size-2 rounded-full bg-skin-border" />
          Activate oSnap
        </UiButton>
      </div>
    </div>
  </template>
</template>
