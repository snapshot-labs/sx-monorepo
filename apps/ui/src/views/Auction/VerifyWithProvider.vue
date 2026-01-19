<script setup lang="ts">
import { AuctionNetworkId, VerificationStatus } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import {
  ProviderId,
  PROVIDERS
} from '@/helpers/auction/verification-providers';

const VERIFICATION_PENDING_STATUSES: readonly VerificationStatus[] = [
  'loading',
  'pending',
  'scanning',
  'generating'
];

const props = defineProps<{
  network: AuctionNetworkId;
  auction: AuctionDetailFragment;
  provider: ProviderId;
}>();

const {
  isVerified,
  status: verificationStatus,
  error,
  verificationUrl,
  startVerification,
  reset,
  checkStatus
} = useAuctionVerification({
  network: computed(() => props.network),
  auction: computed(() => props.auction)
});

const isPending = computed(() =>
  VERIFICATION_PENDING_STATUSES.includes(verificationStatus.value)
);

watch(
  [verificationStatus, () => props.network, () => props.auction],
  ([verificationStatus]) => {
    if (verificationStatus === 'started') {
      startVerification();
    }
  },
  { immediate: true }
);
</script>
<template>
  <UiContainer class="pt-5 w-full !max-w-[730px] mx-0 md:mx-auto text-center">
    <h2>Verify yourself with {{ PROVIDERS[provider].name }}</h2>
    <UiLoading
      v-if="verificationStatus === 'loading' && provider !== 'sumsub'"
      class="block mt-4"
    />
    <div v-if="isVerified" class="mt-4">
      <UiAlert type="success">
        You have been successfully verified and can now participate in the
        auction.
      </UiAlert>
      <UiButton
        class="w-full mt-4"
        primary
        :to="{
          name: 'auction-overview'
        }"
      >
        Go back to auction
      </UiButton>
    </div>

    <ZKPassportVerification
      v-else-if="isPending && provider === 'zkpassport' && verificationUrl"
      :status="verificationStatus"
      :verification-url="verificationUrl"
    />
    <SumsubVerification
      v-else-if="isPending && provider === 'sumsub'"
      :status="verificationStatus"
      :verification-url="verificationUrl"
      @check-status="checkStatus"
    />

    <div
      v-else-if="verificationStatus === 'verified'"
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
      v-else-if="['rejected', 'error'].includes(verificationStatus)"
      class="p-4 space-y-4"
    >
      <div class="flex items-center gap-3">
        <div class="bg-skin-danger text-white rounded-full p-2 shrink-0">
          <IH-x-mark class="size-4" />
        </div>
        <div>
          <h4 class="font-semibold text-skin-danger leading-5">
            {{
              verificationStatus === 'rejected'
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
  </UiContainer>
</template>
