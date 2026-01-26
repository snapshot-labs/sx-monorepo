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
  network?: AuctionNetworkId;
  auction?: AuctionDetailFragment;
}>();

const { web3Account } = useWeb3();
const { modalAccountOpen } = useModal();

const {
  verificationType,
  acceptedProviders,
  activeProviderId,
  status: verificationStatus,
  error,
  verificationUrl,
  isVerified,
  startVerification,
  reset,
  checkStatus
} = useAuctionVerification({
  network: computed(
    () =>
      props.network ??
      (import.meta.env.VITE_METADATA_NETWORK === 's' ? 'eth' : 'sep')
  ),
  auction: computed(() => props.auction)
});

const isConnected = computed(() => !!web3Account.value);
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
    <UiButton
      v-else-if="!isConnected"
      class="w-full mt-4"
      primary
      @click="modalAccountOpen = true"
    >
      Connect wallet
    </UiButton>
    <div v-else-if="isVerified" class="mt-4">
      <UiAlert type="success">
        You have been successfully verified and can now participate in the
        auction.
      </UiAlert>
      <UiButton
        v-if="auction"
        class="w-full mt-4"
        primary
        :to="{
          name: 'auction-overview'
        }"
      >
        Go back to auction
      </UiButton>
    </div>
    <div
      v-else-if="verificationType === 'unknownSigner'"
      class="p-4 text-skin-text text-sm"
    >
      This auction uses an unsupported verification provider
    </div>
    <div v-else-if="verificationStatus === 'started'" class="mt-4 space-y-3">
      <UiButton
        v-for="providerId in acceptedProviders"
        :key="providerId"
        class="w-full"
        primary
        @click="startVerification(providerId)"
      >
        Verify with {{ PROVIDERS[providerId].name }}
      </UiButton>
    </div>

    <ZKPassportVerification
      v-else-if="
        isPending && activeProviderId === 'zkpassport' && verificationUrl
      "
      :status="verificationStatus"
      :verification-url="verificationUrl"
    />
    <SumsubVerification
      v-else-if="isPending && activeProviderId === 'sumsub'"
      :status="verificationStatus"
      :verification-url="verificationUrl"
      @check-status="checkStatus"
    />

    <UiButton
      v-if="isPending && acceptedProviders.length > 1"
      class="mt-4"
      @click="reset"
    >
      Use different provider
    </UiButton>

    <div
      v-else-if="['rejected', 'error'].includes(verificationStatus)"
      class="mt-4 space-y-3 max-w-[400px] mx-auto text-left"
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
      <UiButton
        class="w-full"
        @click="
          activeProviderId ? startVerification(activeProviderId) : reset()
        "
        >Try again</UiButton
      >
    </div>
  </UiContainer>
</template>
