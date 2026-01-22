<script setup lang="ts">
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { sleep } from '@walletconnect/utils';
import { REFERRAL_SHARE } from '@/helpers/auction/referral';
import { getNames } from '@/helpers/stamp';
import { _p, compareAddresses, shortenAddress } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { REFERRAL_KEYS, useUserInviteQuery } from '@/queries/referral';

// TODO: This needs to be updated when we can get network ID from auctionTag
const NETWORK_ID = 'sep';

const route = useRoute();
const queryClient = useQueryClient();
const { web3Account } = useWeb3();
const { modalAccountOpen } = useModal();
const { setPartner } = useAuctionReferralActions(() => NETWORK_ID);

const isModalOpen = ref(false);
const inviteAddress = computed(() => (route.params.partner as string) || '');
const auctionTag = computed(() => (route.params.auctionTag as string) || '');

const {
  isPending: isUserInvitePending,
  isError: isUserInviteError,
  data: userInvite
} = useUserInviteQuery({
  networkId: () => NETWORK_ID,
  account: web3Account,
  auctionTag
});

const { isPending: isPartnerNamePending, data: inviteName } = useQuery({
  queryKey: ['auctionInvite', 'partnerName', inviteAddress],
  queryFn: async () => {
    const rawAddress = partnerAddress.value.toLowerCase();

    const names = await getNames([rawAddress]);

    return names[rawAddress] ?? null;
  }
});

const partnerAddress = computed(
  () => userInvite.value?.partner ?? inviteAddress.value
);
const partnerName = computed(
  () =>
    userInvite.value?.partnerName ??
    inviteName.value ??
    shortenAddress(partnerAddress.value)
);
const isUserInvitePartner = computed(() =>
  compareAddresses(web3Account.value, partnerAddress.value)
);

async function handleConfirmed() {
  await sleep(5000);

  queryClient.invalidateQueries({ queryKey: REFERRAL_KEYS.all });

  isModalOpen.value = false;
}
</script>

<template>
  <div class="flex !pb-0">
    <UiLoading
      v-if="isPartnerNamePending || (isUserInvitePending && web3Account)"
      class="mx-auto mt-4"
    />
    <UiAlert v-else-if="isUserInviteError" type="error" class="mb-3 m-4 h-fit">
      Failed to load invite information. Please check the link and try again.
    </UiAlert>
    <div
      v-else
      class="mx-auto mt-9 flex flex-col md:border rounded-none md:rounded-lg md:h-fit md:max-w-[440px]"
    >
      <div class="border-b py-3 text-center">
        <h3>{{ userInvite ? 'Your partner' : 'Confirm partner' }}</h3>
      </div>
      <div class="flex-auto">
        <div class="bg-skin-border w-full h-[140px]" />
        <div class="-mt-[64px] flex flex-col items-center gap-2">
          <UiStamp
            :id="partnerAddress"
            :size="80"
            class="border-4 border-skin-bg"
          />
          <h1>{{ partnerName }}</h1>
          <UiAddress
            :address="partnerAddress"
            class="text-[17px] text-skin-text truncate"
          />
          <div class="px-4 text-center text-skin-link pb-4">
            <template v-if="userInvite">
              You have added <b>{{ partnerName }}</b> as partner for the
              <b>{{ auctionTag }}</b> auction. You will get
              {{ _p(REFERRAL_SHARE) }} extra tokens on your successful bids.
            </template>
            <template v-else>
              Do you want to add <b>{{ partnerName }}</b> as partner for the
              <b>{{ auctionTag }}</b> auction and get
              {{ _p(REFERRAL_SHARE) }} extra tokens? The partner can only be set
              once.
            </template>
          </div>
        </div>
      </div>
      <div v-if="!userInvite" class="border-t p-4 text-center">
        <UiButton
          v-if="!web3Account"
          primary
          class="w-full"
          @click="modalAccountOpen = true"
        >
          Connect wallet
        </UiButton>
        <UiButton
          v-else
          :disabled="isUserInvitePartner"
          primary
          class="w-full"
          @click="isModalOpen = true"
        >
          {{ isUserInvitePartner ? "You can't add yourself" : 'Confirm' }}
        </UiButton>
      </div>
    </div>
    <teleport to="#modal">
      <ModalTransactionProgress
        :open="isModalOpen"
        :chain-id="getNetwork(NETWORK_ID).chainId"
        :execute="() => setPartner(auctionTag, inviteAddress)"
        @confirmed="handleConfirmed"
        @close="isModalOpen = false"
        @cancelled="isModalOpen = false"
      />
    </teleport>
  </div>
</template>
