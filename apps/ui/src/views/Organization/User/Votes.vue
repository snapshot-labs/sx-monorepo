<script setup lang="ts">
import { useInfiniteQuery, useQuery } from '@tanstack/vue-query';
import { Organization } from '@/helpers/organizations';
import { getNames } from '@/helpers/stamp';
import { getNetwork } from '@/networks';
import { NetworkID, Proposal, User, Vote } from '@/types';

const PAGINATION_LIMIT = 20;
const VOTES_LIMIT = 1000;

defineOptions({ inheritAttrs: false });

const props = defineProps<{ organization: Organization; user: User }>();

const metaStore = useMetaStore();
const { setTitle } = useTitle();

const spaceIdsByNetwork = computed<Map<NetworkID, string[]>>(() => {
  return props.organization.spaces.reduce((map, s) => {
    if (!map.has(s.network)) map.set(s.network, []);
    map.get(s.network)!.push(s.id);

    return map;
  }, new Map<NetworkID, string[]>());
});

const {
  data: votes,
  isPending: isVotesPending,
  isError: isVotesError
} = useQuery({
  queryKey: [
    'org',
    () => props.organization.id,
    'user',
    () => props.user.id,
    'votes'
  ],
  queryFn: async () => {
    const results = await Promise.all(
      Array.from(spaceIdsByNetwork.value, ([networkId, spaceIds]) =>
        getNetwork(networkId).api.loadUserVotes(spaceIds, props.user.id, {
          limit: VOTES_LIMIT
        })
      )
    );

    return Object.assign({}, ...results) as Record<string, Vote>;
  }
});

const voteKeys = computed<string[]>(() => Object.keys(votes.value ?? {}));

async function loadProposalsByKeys(keys: string[]): Promise<Proposal[]> {
  const proposalIdsByNetwork = new Map<NetworkID, string[]>();

  for (const key of keys) {
    const [networkId, proposalId] = key.split(':') as [NetworkID, string];
    const ids = proposalIdsByNetwork.get(networkId) || [];
    ids.push(proposalId);
    proposalIdsByNetwork.set(networkId, ids);
  }

  const results = await Promise.all(
    Array.from(proposalIdsByNetwork, ([networkId, proposalIds]) =>
      getNetwork(networkId).api.loadProposals(
        spaceIdsByNetwork.value.get(networkId)!,
        { limit: PAGINATION_LIMIT },
        metaStore.getCurrent(networkId) || 0,
        { id_in: proposalIds }
      )
    )
  );

  const proposals = results.flat();
  const names = await getNames(proposals.map(p => p.author.id));

  for (const proposal of proposals) {
    proposal.author.name = names[proposal.author.id];
  }

  return proposals;
}

const {
  data: proposalsData,
  isPending: isProposalsPending,
  isError: isProposalsError,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage
} = useInfiniteQuery({
  initialPageParam: 0,
  queryKey: [
    'org',
    () => props.organization.id,
    'user',
    () => props.user.id,
    'votes',
    'proposals'
  ],
  enabled: () => !!votes.value,
  queryFn: ({ pageParam }) => {
    const keys = voteKeys.value.slice(pageParam, pageParam + PAGINATION_LIMIT);

    if (!keys.length) return [];

    return loadProposalsByKeys(keys);
  },
  getNextPageParam: (lastPage, allPages) => {
    if (lastPage.length < PAGINATION_LIMIT) return null;

    const totalLoaded = allPages.reduce((sum, page) => sum + page.length, 0);
    if (totalLoaded >= voteKeys.value.length) return null;

    return totalLoaded;
  }
});

const proposals = computed(() => proposalsData.value?.pages.flat() ?? []);

const isLoading = computed(
  () =>
    isVotesPending.value ||
    (voteKeys.value.length > 0 && isProposalsPending.value)
);

const isError = computed(() => isVotesError.value || isProposalsError.value);

function handleEndReached() {
  if (!hasNextPage.value) return;

  fetchNextPage();
}

watchEffect(() => setTitle(`${props.user.name || props.user.id} votes`));
</script>

<template>
  <UiColumnHeader>
    <div class="grow truncate">Proposal</div>
    <div class="shrink-0 w-[35%] md:w-[220px] truncate">Choice</div>
  </UiColumnHeader>
  <UiLoading v-if="isLoading" class="block px-4 py-3" />
  <UiStateWarning v-else-if="isError || !proposals.length" class="px-4 py-3">
    <template v-if="isError">Failed to load the votes.</template>
    <template v-else>There are no votes here.</template>
  </UiStateWarning>
  <UiContainerInfiniteScroll
    v-else
    :loading-more="isFetchingNextPage"
    class="mx-4"
    @end-reached="handleEndReached"
  >
    <div
      v-for="proposal in proposals"
      :key="`${proposal.network}:${proposal.id}`"
      class="border-b py-[14px] flex gap-3"
    >
      <ProposalsListItemHeading
        :proposal="proposal"
        :show-author="true"
        :show-space="false"
        :show-voted-indicator="false"
        class="grow truncate w-0"
      />
      <div class="w-[35%] md:w-[220px] shrink-0 flex items-center">
        <ProposalVoteChoice
          :proposal="proposal"
          :vote="votes![`${proposal.network}:${proposal.id}`]"
          :show-reason="false"
        />
      </div>
    </div>
  </UiContainerInfiniteScroll>
</template>
