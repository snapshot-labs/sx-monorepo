<script setup lang="ts">
import {
  AuctionVerificationType,
  VerificationStatus
} from '@/helpers/auction/types';
import { PROVIDERS } from '@/helpers/auction/verification-providers';

defineProps<{
  verificationProvider: AuctionVerificationType;
  status: VerificationStatus;
}>();
</script>

<template>
  <div v-if="verificationProvider === 'private'" class="p-4 text-skin-text">
    This auction uses an unsupported verification provider
  </div>

  <div v-else-if="PROVIDERS[verificationProvider]">
    <div
      v-if="status === 'loading'"
      class="flex flex-col text-center p-6 space-y-3"
    >
      <UiLoading :size="24" />
      <p class="text-sm text-skin-text">Checking verification status</p>
    </div>

    <div v-else-if="status === 'started'" class="p-4 space-y-3">
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
  </div>
</template>
