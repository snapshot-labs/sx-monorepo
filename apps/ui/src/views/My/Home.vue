<script setup lang="ts">
import { computed, onMounted } from 'vue'; // Ensure computed and onMounted are imported
// import { useQuery } from '@tanstack/vue-query'; // No longer needed for this view
// import ProposalIconStatus from '@/components/ProposalIconStatus.vue'; // No longer needed for this view
import BimaLogo from '@/components/App/BimaLogo.vue'; // New: Import BimaLogo
import { metadataNetwork } from '@/networks';
// import { ProposalsFilter } from '@/networks/types'; // No longer needed for this view
// import { useHomeProposalsQuery } from '@/queries/proposals'; // No longer needed for this view
import { useSpaceQuery } from '@/queries/spaces'; // New: Import useSpaceQuery
import { _n } from '@/helpers/utils'; // New: Import _n for number formatting

// New: Import Icons
import IHSparkles from '~icons/heroicons-outline/sparkles';
import IHPlusSm from '~icons/heroicons-outline/plus-sm';
import IHDocumentText from '~icons/heroicons-outline/document-text';


// const selectIconBaseProps = { // No longer needed
//   size: 16
// };

useTitle('Home');

// const metaStore = useMetaStore(); // No longer directly used here
const router = useRouter();
// const followedSpacesStore = useFollowedSpacesStore(); // No longer directly used here
// const { web3 } = useWeb3(); // No longer directly used here for redirection or proposals list
// const { loadVotes } = useAccount(); // No longer directly used here

// const state = ref<NonNullable<ProposalsFilter['state']>>('any'); // No longer needed

// const spacesIds = computed( // No longer needed
//   () => followedSpacesStore.followedSpaceIdsByNetwork[metadataNetwork] ?? []
// );

// const { // No longer needed
//   data,
//   fetchNextPage,
//   hasNextPage,
//   isPending,
//   isError,
//   isFetchingNextPage
// } = useHomeProposalsQuery(metadataNetwork, spacesIds, { state });

// NOTE: This is just wrapper for loadVotes that handles its own state.
// We only care about the loading state here.
// const { isPending: isVotesQueryPending, isError: isVotesQueryError } = useQuery( // No longer needed
//   {
//     queryKey: ['homeFollowedSpacesVotes', spacesIds],
//     queryFn: async () => {
//       if (spacesIds.value.length === 0) return null;

//       await loadVotes(metadataNetwork, spacesIds.value);

//       return null;
//     }
//   }
// );

// New: Fetch Bima DAO space data
const BIMA_ETH_SPACE_ID = 'bima.eth'; // Assuming 'bima.eth' is the ID part of the space key
const BIMA_SPACE_KEY = computed(() => `${metadataNetwork}:${BIMA_ETH_SPACE_ID}`);

const {
  data: bimaSpace,
  isPending: isSpaceLoading,
  isError: isSpaceError
} = useSpaceQuery({
  networkId: metadataNetwork,
  spaceId: BIMA_ETH_SPACE_ID
});


// onMounted(() => { // No longer directly used here for metaStore.fetchBlock
//   metaStore.fetchBlock(metadataNetwork);
// });

// async function handleEndReached() { // No longer needed
//   if (!hasNextPage.value) return;

//   fetchNextPage();
// }

// Removed: watch that redirects to my-explore if not logged in,
// as this home page is now a public landing.
// watch(
//   [() => web3.value.account, () => web3.value.authLoading],
//   ([account, authLoading]) => {
//     if (!account && !authLoading) {
//       router.replace({ name: 'my-explore' });
//     }
//   },
//   { immediate: true }
// );
</script>

<template>
  <div class="max-w-[800px] mx-auto text-center px-4 py-8">
    <h1 class="text-4xl md:text-5xl font-bold mb-4">Bima DAO Governance</h1>
    <p class="text-lg text-gray-700 mb-8 max-w-[600px] mx-auto">
      Join the sustainable blockchain revolution. Vote on proposals, shape our green future, and help build a carbon-neutral decentralized ecosystem.
    </p>

    <div class="flex justify-center space-x-4 mb-12">
      <UiButton class="primary" :to="{ name: 'space-proposals', params: { space: BIMA_SPACE_KEY } }">
        <IHSparkles class="inline-block mr-2" /> View Proposals
      </UiButton>
      <UiButton :to="{ name: 'space-editor', params: { space: BIMA_SPACE_KEY, key: 'new' } }">
        <IHPlusSm class="inline-block mr-2" /> Create Proposal
      </UiButton>
    </div>

    <div v-if="bimaSpace" class="bg-white rounded-xl shadow p-6 border border-skin-border">
      <div class="flex items-center mb-6">
        <BimaLogo class="h-8 w-auto mr-3 text-black" />
        <div>
          <h2 class="text-2xl font-semibold">Bima DAO</h2>
          <p class="text-md text-gray-600">Sustainable blockchain governance for a greener future</p>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
        <div>
          <p class="text-3xl font-bold">{{ _n(bimaSpace.follower_count || 2847) }}</p> <!-- Use space data or fallback -->
          <p class="text-sm text-gray-500">Members (Static)</p>
        </div>
        <div>
          <p class="text-3xl font-bold">{{ _n(bimaSpace.active_proposals || 0) }}</p> <!-- Use space data or fallback -->
          <p class="text-sm text-gray-500">Active Proposals</p>
        </div>
        <div>
          <p class="text-3xl font-bold">{{ _n(bimaSpace.proposal_count || 15) }}</p> <!-- Use space data or fallback -->
          <p class="text-sm text-gray-500">Total Proposals</p>
        </div>
        <div>
          <p class="text-3xl font-bold">$2.4M</p> <!-- Hardcoded as per image -->
          <p class="text-sm text-gray-500">Treasury (Static)</p>
        </div>
      </div>

      <UiButton class="primary w-full" :to="{ name: 'space-overview', params: { space: BIMA_SPACE_KEY } }">
        <IHDocumentText class="inline-block mr-2" /> Enter Governance Portal
      </UiButton>
    </div>
    <UiLoading v-else-if="isSpaceLoading" class="mt-8" />
    <UiAlert v-else-if="isSpaceError" type="error" class="mt-8">
      Failed to load Bima DAO space data.
    </UiAlert>
  </div>
</template>
