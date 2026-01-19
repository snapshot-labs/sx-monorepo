<script setup lang="ts">
import { AuctionNetworkId } from '@/helpers/auction';
import { AuctionDetailFragment } from '@/helpers/auction/gql/graphql';
import { PROVIDERS } from '@/helpers/auction/verification-providers';

const props = defineProps<{
  network: AuctionNetworkId;
  auction: AuctionDetailFragment;
}>();

const {
  verificationProvider,
  status: verificationStatus,
  isVerified
} = useAuctionVerification({
  network: computed(() => props.network),
  auction: computed(() => props.auction)
});
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
      <UiButton
        class="w-full"
        primary
        :to="{
          name: `auction-verify-${verificationProvider}`
        }"
      >
        Verify with {{ PROVIDERS[verificationProvider]?.name }}
      </UiButton>
    </div>
  </UiContainer>
</template>
