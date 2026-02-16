<script setup lang="ts">
import { VerificationStatus } from '@/helpers/auction/types';

defineProps<{
  status: VerificationStatus;
  verificationUrl: string | null;
}>();

const emit = defineEmits<{
  (e: 'checkStatus'): void;
}>();
</script>

<template>
  <div>
    <div
      v-if="status === 'pending' && verificationUrl"
      class="p-6 space-y-5 text-center"
    >
      <div class="flex flex-col items-center gap-3">
        <div class="bg-skin-link/10 rounded-full p-4 ring-1 ring-skin-link/20">
          <IH-arrow-top-right-on-square class="text-skin-link size-6" />
        </div>
        <div class="space-y-1">
          <h4 class="font-semibold text-xl">Complete verification</h4>
          <p class="text-skin-text text-sm leading-relaxed max-w-xs mx-auto">
            Click below to verify your identity
          </p>
        </div>
      </div>
      <div class="space-y-2">
        <UiButton class="w-full" primary :to="verificationUrl">
          Open verification page
        </UiButton>
        <UiButton class="w-full text-skin-link" @click="emit('checkStatus')">
          <IH-refresh class="size-4 mr-1.5" />
          Check status
        </UiButton>
      </div>
      <p class="text-skin-text/60 text-xs leading-relaxed max-w-sm mx-auto">
        Complete verification on Sumsub, then return here to place your bid.
      </p>
    </div>
  </div>
</template>
