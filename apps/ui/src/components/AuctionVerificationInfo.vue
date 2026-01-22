<script setup lang="ts">
import { AuctionVerificationType } from '@/helpers/auction/types';

defineProps<{
  verificationType: AuctionVerificationType;
  isLoading: boolean;
}>();
</script>

<template>
  <div
    v-if="verificationType === 'unknownSigner'"
    class="p-4 text-skin-text text-sm"
  >
    This auction uses an unsupported verification provider
  </div>

  <div v-else-if="isLoading" class="flex flex-col text-center p-6 space-y-3">
    <UiLoading :size="24" />
    <p class="text-sm text-skin-text">Checking verification status</p>
  </div>

  <div v-else class="p-4 space-y-3">
    <div class="flex items-center gap-3">
      <div class="bg-skin-border rounded-full p-2.5 shrink-0">
        <IH-shield-check class="text-skin-link" />
      </div>
      <div>
        <h4 class="font-semibold leading-5">Verification required</h4>
      </div>
    </div>
    <UiButton class="w-full" primary :to="{ name: 'auction-verify' }">
      Verify
    </UiButton>
  </div>
</template>
