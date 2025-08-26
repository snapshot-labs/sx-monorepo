<script setup lang="ts">
import { useInfiniteQuery } from '@tanstack/vue-query';
import { getNames } from '@/helpers/stamp';
import { _n, _p, shorten } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { Space, UserActivity } from '@/types';

const USERS_LIMIT = 20;

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();

const sortBy = ref(
  'vote_count-desc' as
    | 'vote_count-desc'
    | 'vote_count-asc'
    | 'proposal_count-desc'
    | 'proposal_count-asc'
);

const network = computed(() => getNetwork(props.space.network));

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

function handleSortChange(type: 'vote_count' | 'proposal_count') {
  if (sortBy.value.startsWith(type)) {
    sortBy.value = sortBy.value.endsWith('desc')
      ? `${type}-asc`
      : `${type}-desc`;
  } else {
    sortBy.value = `${type}-desc`;
  }
}

function handleEndReached() {
  if (!hasNextPage.value) return;

  fetchNextPage();
}

watchEffect(() => setTitle(`Leaderboard - ${props.space.name}`));
</script>

<template>
  <div>
    <UiSectionHeader label="Leaderboard" sticky />
    <div
      class="bg-skin-bg sticky top-[112px] lg:top-[113px] z-40 border-b w-full flex font-medium space-x-1"
    >
      <div class="pl-4 w-[40%] lg:w-[50%] flex items-center truncate">User</div>
      <button
        type="button"
        class="flex w-[30%] lg:w-[25%] items-center justify-end hover:text-skin-link space-x-1 truncate"
        @click="handleSortChange('proposal_count')"
      >
        <span class="truncate">Proposals</span>
        <IH-arrow-sm-down
          v-if="sortBy === 'proposal_count-desc'"
          class="shrink-0"
        />
        <IH-arrow-sm-up
          v-else-if="sortBy === 'proposal_count-asc'"
          class="shrink-0"
        />
      </button>
      <button
        type="button"
        class="flex justify-end items-center hover:text-skin-link pr-4 w-[30%] lg:w-[25%] space-x-1 truncate"
        @click="handleSortChange('vote_count')"
      >
        <span class="truncate">Votes</span>
        <IH-arrow-sm-down
          v-if="sortBy === 'vote_count-desc'"
          class="shrink-0"
        />
        <IH-arrow-sm-up
          v-else-if="sortBy === 'vote_count-asc'"
          class="shrink-0"
        />
      </button>
    </div>
    <UiLoading v-if="isPending" class="px-4 py-3 block" />
    <template v-else>
      <div
        v-if="isError || data?.pages.flat().length === 0"
        class="px-4 py-3 flex items-center space-x-2"
      >
        <IH-exclamation-circle class="inline-block" />
        <span v-if="isError">Failed to load the leaderboard.</span>
        <span v-else-if="data?.pages.flat().length === 0">
          This space does not have any activities yet.
        </span>
      </div>
      <UiContainerInfiniteScroll
        :loading-more="isFetchingNextPage"
        @end-reached="handleEndReached"
      >
        <div
          v-for="(user, i) in data?.pages.flat()"
          :key="i"
          class="border-b flex space-x-1"
        >
          <div
            class="flex items-center pl-4 py-3 gap-x-3 leading-[22px] w-[40%] lg:w-[50%] truncate"
          >
            <UiStamp :id="user.id" :size="32" />
            <AppLink
              :to="{
                name: 'space-user-statement',
                params: { space: `${space.network}:${space.id}`, user: user.id }
              }"
              class="overflow-hidden"
            >
              <h4
                class="text-skin-link truncate"
                v-text="user.name || shorten(user.id)"
              />
              <div
                class="text-[17px] text-skin-text truncate"
                v-text="shorten(user.id)"
              />
            </AppLink>
          </div>
          <div
            class="flex flex-col items-end justify-center leading-[22px] w-[30%] lg:w-[25%] truncate"
          >
            <h4 class="text-skin-link" v-text="_n(user.proposal_count)" />
            <div class="text-[17px]">
              {{ _p(user.proposal_count / space.proposal_count) }}
            </div>
          </div>
          <div
            class="flex flex-col items-end justify-center pr-4 leading-[22px] w-[30%] lg:w-[25%] truncate"
          >
            <h4 class="text-skin-link" v-text="_n(user.vote_count)" />
            <div class="text-[17px]">
              {{ _p(user.vote_count / space.proposal_count) }}
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
