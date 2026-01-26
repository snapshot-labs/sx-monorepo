<script setup lang="ts">
import { AuctionVerificationType } from '@/helpers/auction/types';

defineProps<{
  verificationType: AuctionVerificationType;
  isLoading: boolean;
  isError: boolean;
}>();

const { web3Account } = useWeb3();

const isConnected = computed(() => !!web3Account.value);
</script>

<template>
  <div v-if="isLoading" class="flex flex-col text-center p-6 space-y-3">
    <UiLoading :size="24" />
    <p class="text-sm text-skin-text">Checking verification status</p>
  </div>
  <div v-if="isError" class="p-4 text-skin-danger text-sm text-center">
    An error occurred while checking verification status. Please try again
    later.
  </div>
  <div
    v-else-if="isConnected && verificationType === 'unknownSigner'"
    class="p-4 text-skin-text text-sm"
  >
    This auction uses an unsupported verification provider
  </div>
  <div v-else class="p-4 space-y-3">
    <div class="flex items-center gap-3">
      <div class="bg-skin-border rounded-full p-2.5 shrink-0">
        <IH-shield-check class="text-skin-link" />
      </div>
      <h4 class="font-semibold leading-5">Verification required</h4>
    </div>
    <UiButton class="w-full" primary :to="{ name: 'auction-verify' }">
      Verify
    </UiButton>
  </div>
</template>
