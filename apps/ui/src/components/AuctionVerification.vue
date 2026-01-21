<script setup lang="ts">
import {
  AuctionVerificationType,
  VerificationProviderId,
  VerificationStatus
} from '@/helpers/auction/types';
import { PROVIDERS } from '@/helpers/auction/verification-providers';

const VERIFICATION_PENDING_STATUSES: readonly VerificationStatus[] = [
  'loading',
  'pending',
  'scanning',
  'generating'
];

const props = defineProps<{
  isConnected: boolean;
  verificationType: AuctionVerificationType;
  acceptedProviders: VerificationProviderId[];
  activeProviderId: VerificationProviderId | null;
  status: VerificationStatus;
  verificationUrl: string | null;
  error: string | null;
}>();

const emit = defineEmits<{
  (e: 'connect'): void;
  (e: 'startVerification', provider?: VerificationProviderId): void;
  (e: 'checkStatus'): void;
  (e: 'reset'): void;
}>();

const isPending = computed(() =>
  VERIFICATION_PENDING_STATUSES.includes(props.status)
);
</script>

<template>
  <div
    v-if="status === 'loading'"
    class="flex flex-col text-center p-6 space-y-3"
  >
    <UiLoading :size="24" />
    <p class="text-sm text-skin-text">Checking verification status</p>
  </div>

  <div v-else-if="!isConnected || status === 'started'" class="p-4 space-y-3">
    <div class="flex items-center gap-3">
      <div class="bg-skin-border rounded-full p-2.5 shrink-0">
        <IH-shield-check class="text-skin-link" />
      </div>
      <div>
        <h4 class="font-semibold leading-5">Verification required</h4>
        <p class="text-skin-text text-sm">
          We need to verify your identity to proceed
        </p>
      </div>
    </div>
    <UiButton
      v-if="!isConnected"
      class="w-full"
      primary
      @click="emit('connect')"
    >
      Connect wallet
    </UiButton>
    <UiButton
      v-for="providerId in acceptedProviders"
      v-else
      :key="providerId"
      class="w-full"
      primary
      @click="emit('startVerification', providerId)"
    >
      Verify with {{ PROVIDERS[providerId]?.name }}
    </UiButton>
  </div>

  <div
    v-else-if="verificationType === 'unknownSigner'"
    class="p-4 text-skin-text text-sm"
  >
    This auction uses an unsupported verification provider
  </div>

  <template v-else>
    <ZKPassportVerification
      v-if="isPending && activeProviderId === 'zkpassport' && verificationUrl"
      :status="status"
      :verification-url="verificationUrl"
    />
    <SumsubVerification
      v-else-if="isPending && activeProviderId === 'sumsub'"
      :status="status"
      :verification-url="verificationUrl"
      @check-status="emit('checkStatus')"
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
      <UiButton class="w-full" @click="emit('reset')">Try again</UiButton>
    </div>
  </template>
</template>
