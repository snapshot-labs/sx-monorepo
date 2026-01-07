<script setup lang="ts">
import { VERIFICATION_PENDING_STATUSES } from '@/helpers/auction/types';
import { VERIFICATION_PROVIDER_CONFIG } from '@/helpers/auction/verification-providers';

const props = defineProps<{
  auctionId: string;
  allowListSigner: string;
}>();

const {
  verificationType,
  status,
  isVerified,
  isCheckingStatus,
  verificationUrl,
  error,
  startVerification,
  getAttestation,
  checkStatus,
  reset
} = useAuctionVerification(props.auctionId, props.allowListSigner);

const isPending = computed(() =>
  VERIFICATION_PENDING_STATUSES.includes(status.value)
);

defineExpose({
  isVerified,
  getAttestation
});
</script>

<template>
  <div
    v-if="verificationType !== 'public' && !isVerified"
    class="s-box overflow-hidden"
  >
    <div v-if="verificationType === 'private'" class="p-4">
      <div class="flex items-center gap-3">
        <div class="bg-skin-danger/10 rounded-full p-2.5 shrink-0">
          <IH-lock-closed class="text-skin-danger" />
        </div>
        <div>
          <p class="text-skin-text text-sm">
            This auction uses a verification method that is not supported
          </p>
        </div>
      </div>
    </div>

    <div v-else-if="status === 'start'" class="p-4 space-y-3">
      <div class="flex items-center gap-3">
        <div class="bg-skin-border rounded-full p-2.5 shrink-0">
          <IH-shield-check class="text-skin-link" />
        </div>
        <div>
          <h4 class="font-semibold leading-5">Verification required</h4>
        </div>
      </div>
      <UiButton class="w-full" primary @click="startVerification">
        Verify with {{ VERIFICATION_PROVIDER_CONFIG[verificationType]?.name }}
      </UiButton>
    </div>

    <ZKPassportVerification
      v-else-if="
        isPending && verificationType === 'zkpassport' && verificationUrl
      "
      :status="status"
      :verification-url="verificationUrl"
    />
    <SumsubVerification
      v-else-if="isPending && verificationType === 'sumsub'"
      :status="status"
      :is-checking-status="isCheckingStatus"
      :verification-url="verificationUrl"
      @check-status="checkStatus"
    />

    <div
      v-else-if="status === 'verified'"
      class="flex items-center gap-3 p-4 bg-skin-success/10"
    >
      <div class="bg-skin-success text-white rounded-full p-2 shrink-0">
        <IH-check class="size-4" />
      </div>
      <div class="min-w-0">
        <h4 class="font-semibold text-skin-success leading-5">
          Verification complete
        </h4>
        <p class="text-skin-text text-sm">Your identity has been verified</p>
      </div>
    </div>

    <div
      v-else-if="['rejected', 'error'].includes(status)"
      class="p-4 space-y-4"
    >
      <div class="flex items-center gap-3">
        <div class="bg-skin-danger text-white rounded-full p-2 shrink-0">
          <IH-x-mark class="size-4" />
        </div>
        <div>
          <h4 class="font-semibold text-skin-danger leading-5">
            {{
              status === 'rejected'
                ? 'Verification declined'
                : 'Something went wrong'
            }}
          </h4>
          <p class="text-skin-text text-sm">
            {{ error ?? 'Please try again' }}
          </p>
        </div>
      </div>
      <UiButton class="w-full" @click="reset">Try again</UiButton>
    </div>
  </div>
</template>
