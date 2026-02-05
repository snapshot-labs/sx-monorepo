<script setup lang="ts">
import { useInfiniteQuery } from '@tanstack/vue-query';
import { getNames } from '@/helpers/stamp';
import { _n, _p, shorten } from '@/helpers/utils';
import { getNetwork, offchainNetworks } from '@/networks';
import { Space, UserActivity } from '@/types';

type SortableColumn = 'proposal_count' | 'vote_count' | 'vp_value';

const USERS_LIMIT = 20;

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();

const network = computed(() => getNetwork(props.space.network));

const isOffchainNetwork = computed(() =>
  offchainNetworks.includes(props.space.network)
);

const sortBy = ref(
  (isOffchainNetwork.value ? 'vp_value-desc' : 'vote_count-desc') as
    | 'vote_count-desc'
    | 'vote_count-asc'
    | 'proposal_count-desc'
    | 'proposal_count-asc'
    | 'vp_value-desc'
    | 'vp_value-asc'
);

const {
  data,
  fetchNextPage,
  hasNextPage,
  isPending,
  isFetchingNextPage,
  isError
} = useInfiniteQuery({
  initialPageParam: 0,
  queryKey: [
    'leaderboard',
    () => props.space.id,
    'list',
    {
      sortBy
    }
  ],
  queryFn: async ({ pageParam }) => {
    return withAuthorNames(
      await network.value.api.loadLeaderboard(
        props.space.id,
        {
          limit: USERS_LIMIT,
          skip: pageParam
        },
        sortBy.value
      )
    );
  },
  getNextPageParam: (lastPage, pages) => {
    if (lastPage.length < USERS_LIMIT) return null;

    return pages.length * USERS_LIMIT;
  }
});

async function withAuthorNames(users: UserActivity[]): Promise<UserActivity[]> {
  if (!users.length) return [];

  const names = await getNames(users.map(user => user.id));

  return users.map(user => {
    user.name = names[user.id];

    return user;
  });
}

function handleSortChange(type: SortableColumn) {
  if (sortBy.value.startsWith(type)) {
    sortBy.value = sortBy.value.endsWith('desc')
      ? `${type}-asc`
      : `${type}-desc`;
  } else {
    sortBy.value = `${type}-desc`;
  }
}

const orderDirection = computed(
  () => sortBy.value.split('-')[1] as 'asc' | 'desc'
);

const orderBy = computed(() => sortBy.value.split('-')[0]);

const statsColumn = computed<Partial<Record<SortableColumn, string>>>(() => {
  return {
    ...{
      proposal_count: 'Proposals',
      vote_count: 'Votes'
    },
    ...(isOffchainNetwork.value ? { vp_value: 'VP value' } : {})
  };
});

function handleEndReached() {
  if (!hasNextPage.value) return;

  fetchNextPage();
}

watchEffect(() => setTitle(`Leaderboard - ${props.space.name}`));
</script>

<template>
  <div>
    <UiSectionHeader label="Leaderboard" sticky />
    <UiColumnHeader>
      <div class="w-[40%] flex items-center truncate">User</div>
      <div class="grid grid-flow-col auto-cols-fr w-[60%]">
        <UiColumnHeaderItemSortable
          v-for="(label, key) in statsColumn"
          :key="key"
          :is-ordered="orderBy === key"
          :order-direction="orderDirection"
          :label="label!"
          @sort-change="handleSortChange(key as SortableColumn)"
        />
      </div>
    </UiColumnHeader>
    <UiLoading v-if="isPending" class="px-4 py-3 block" />
    <template v-else>
      <UiStateWarning
        v-if="isError || data?.pages.flat().length === 0"
        class="px-4 py-3"
      >
        <template v-if="isError"> Failed to load the leaderboard. </template>
        <template v-else>
          This space does not have any activities yet.
        </template>
      </UiStateWarning>
      <UiContainerInfiniteScroll
        :loading-more="isFetchingNextPage"
        class="px-4"
        @end-reached="handleEndReached"
      >
        <div
          v-for="(user, i) in data?.pages.flat()"
          :key="i"
          class="border-b flex space-x-1"
        >
          <div
            class="flex items-center py-3 gap-x-3 leading-[22px] w-[40%] truncate"
          >
            <UiStamp :id="user.id" :size="32" />
            <AppLink
              :to="{
                name: 'space-user-statement',
                params: { space: `${space.network}:${space.id}`, user: user.id }
              }"
              class="overflow-hidden group"
            >
              <h4
                class="text-skin-link truncate"
                v-text="user.name || shorten(user.id)"
              />
              <UiAddress
                :address="user.id"
                class="text-[17px] text-skin-text truncate"
              />
            </AppLink>
          </div>
          <div class="grid grid-flow-col auto-cols-fr w-[60%]">
            <div
              class="flex flex-col items-end justify-center leading-[22px] truncate"
            >
              <h4 class="text-skin-link" v-text="_n(user.proposal_count)" />
              <div class="text-[17px]">
                {{ _p(user.proposal_count / space.proposal_count) }}
              </div>
            </div>
            <div
              class="flex flex-col items-end justify-center leading-[22px] truncate"
            >
              <h4 class="text-skin-link" v-text="_n(user.vote_count)" />
              <div class="text-[17px]">
                {{ _p(user.vote_count / space.proposal_count) }}
              </div>
            </div>
            <div
              v-if="isOffchainNetwork"
              class="flex flex-col items-end justify-center leading-[22px] truncate"
            >
              <h4 class="text-skin-link" v-text="_n(user.vp_value)" />
              <div class="text-[17px]">USD</div>
            </div>
          </div>
        </div>
        <template #loading>
          <UiLoading class="px-4 py-3 block" />
        </template>
      </UiContainerInfiniteScroll>
    </template>
  </div>
</template>
