<script setup lang="ts">
import { AuctionNetworkId, VerificationStatus } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { PROVIDERS } from '@/helpers/auction/verification-providers';

const VERIFICATION_PENDING_STATUSES: readonly VerificationStatus[] = [
  'loading',
  'pending',
  'scanning',
  'generating'
];

const props = defineProps<{
  network: AuctionNetworkId;
  auction: AuctionDetailFragment;
}>();

const {
  verificationProvider,
  status: verificationStatus,
  error,
  verificationUrl,
  isVerified,
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
</script>
<template>
  <UiContainer class="pt-5 w-full !max-w-[730px] mx-0 md:mx-auto text-center">
    <h2>Verify yourself to participate in auction</h2>
    <div>
      To participate in this auction, you need to complete the verification
      process.
    </div>
    <UiLoading v-if="verificationStatus === 'loading'" class="block mt-4" />
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
    <div v-else-if="verificationStatus === 'started'" class="mt-4 space-y-3">
      <UiButton class="w-full" primary @click="startVerification">
        Verify with {{ PROVIDERS[verificationProvider]?.name }}
      </UiButton>
    </div>

    <ZKPassportVerification
      v-else-if="
        isPending && verificationProvider === 'zkpassport' && verificationUrl
      "
      :status="verificationStatus"
      :verification-url="verificationUrl"
    />
    <SumsubVerification
      v-else-if="isPending && verificationProvider === 'sumsub'"
      :status="verificationStatus"
      :verification-url="verificationUrl"
      @check-status="checkStatus"
    />

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
