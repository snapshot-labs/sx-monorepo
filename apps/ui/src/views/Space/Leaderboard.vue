<script setup lang="ts">
import { getNames } from '@/helpers/stamp';
import { _n, _p, shorten } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { Space, User } from '@/types';

const USERS_LIMIT = 20;

type UserWithName = User & { name?: string };

const props = defineProps<{ space: Space }>();

const uiStore = useUiStore();
const { setTitle } = useTitle();

const loaded = ref(false);
const loadingMore = ref(false);
const failed = ref(false);
const hasMore = ref(false);
const users = ref<UserWithName[]>([]);
const sortBy = ref(
  'vote_count-desc' as
    | 'vote_count-desc'
    | 'vote_count-asc'
    | 'proposal_count-desc'
    | 'proposal_count-asc'
);

const network = computed(() => getNetwork(props.space.network));

async function withAuthorNames(users: UserWithName[]): Promise<UserWithName[]> {
  if (!users.length) return [];

  const names = await getNames(users.map(user => user.id));

  return users.map(user => {
    user.name = names[user.id];

    return user;
  });
}

function reset() {
  users.value = [];
  loaded.value = false;
  failed.value = false;
  loadingMore.value = false;
  hasMore.value = false;
}

async function loadUsers(): Promise<UserWithName[]> {
  return withAuthorNames(
    await network.value.api.loadLeaderboard(
      props.space.id,
      {
        limit: USERS_LIMIT,
        skip: users.value.length
      },
      sortBy.value
    )
  );
}

async function fetch() {
  loaded.value = false;

  try {
    users.value = await loadUsers();
    hasMore.value = users.value.length === USERS_LIMIT;
  } catch (e) {
    failed.value = true;
  } finally {
    loaded.value = true;
  }
}

async function fetchMore() {
  loadingMore.value = true;

  try {
    const moreUsers = await loadUsers();

    users.value = [...users.value, ...moreUsers];
    hasMore.value = moreUsers.length === USERS_LIMIT;
  } catch (e) {
    uiStore.addNotification('error', 'Failed to load more users');
  } finally {
    loadingMore.value = false;
  }
}

function handleSortChange(type: 'vote_count' | 'proposal_count') {
  if (sortBy.value.startsWith(type)) {
    sortBy.value = sortBy.value.endsWith('desc') ? `${type}-asc` : `${type}-desc`;
  } else {
    sortBy.value = `${type}-desc`;
  }
}

function handleEndReached() {
  if (hasMore.value) fetchMore();
}

onMounted(() => fetch());

watch([sortBy], () => {
  reset();
  fetch();
});

watchEffect(() => setTitle(`Leaderboard - ${props.space.name}`));
</script>

<template>
  <div class="space-y-3">
    <div>
      <UiLabel label="Leaderboard" sticky />
      <table class="text-left table-fixed w-full">
        <colgroup>
          <col class="w-auto" />
          <col class="w-auto md:w-[120px]" />
          <col class="w-0 md:w-[240px]" />
        </colgroup>
        <thead
          class="bg-skin-bg sticky top-[112px] lg:top-[113px] z-40 after:border-b after:absolute after:w-full"
        >
          <tr>
            <th class="pl-4 font-medium">
              <span class="relative bottom-[1px]">User</span>
            </th>
            <th class="hidden md:table-cell">
              <button
                class="relative bottom-[1px] flex items-center justify-end min-w-0 w-full font-medium hover:text-skin-link"
                @click="handleSortChange('proposal_count')"
              >
                <span>Proposals</span>
                <IH-arrow-sm-down v-if="sortBy === 'proposal_count-desc'" class="ml-1" />
                <IH-arrow-sm-up v-else-if="sortBy === 'proposal_count-asc'" class="ml-1" />
              </button>
            </th>
            <th>
              <button
                class="relative bottom-[1px] flex justify-end items-center min-w-0 w-full font-medium hover:text-skin-link pr-4"
                @click="handleSortChange('vote_count')"
              >
                <span class="truncate">Votes</span>
                <IH-arrow-sm-down v-if="sortBy === 'vote_count-desc'" class="ml-1" />
                <IH-arrow-sm-up v-else-if="sortBy === 'vote_count-asc'" class="ml-1" />
              </button>
            </th>
          </tr>
        </thead>
        <td v-if="!loaded" colspan="3">
          <UiLoading class="px-4 py-3 block" />
        </td>
        <template v-else>
          <tbody>
            <td v-if="failed" class="px-4 py-3 flex items-center" colspan="3">
              <IH-exclamation-circle class="inline-block mr-2" />
              Failed to load the leaderboard.
            </td>
            <td v-else-if="users.length === 0" class="px-4 py-3 flex items-center" colspan="3">
              <IH-exclamation-circle class="inline-block mr-2" />
              This space does not have any activities yet.
            </td>
            <UiContainerInfiniteScroll :loading-more="loadingMore" @end-reached="handleEndReached">
              <tr v-for="(user, i) in users" :key="i" class="border-b relative">
                <td class="text-left flex items-center pl-4 py-3">
                  <UiStamp :id="user.id" :size="32" class="mr-3" />
                  <div class="overflow-hidden">
                    <router-link
                      class="text-skin-text"
                      :to="{
                        name: 'user',
                        params: { id: user.id }
                      }"
                    >
                      <div class="leading-[22px]">
                        <h4
                          class="text-skin-link truncate"
                          v-text="user.name || shorten(user.id)"
                        />
                        <div
                          class="text-[17px] text-skin-text truncate"
                          v-text="shorten(user.id)"
                        />
                      </div>
                    </router-link>
                  </div>
                </td>
                <td class="hidden md:table-cell align-middle text-right">
                  <h4 class="text-skin-link" v-text="_n(user.proposal_count)" />
                  <div class="text-[17px]">
                    {{ _p(user.proposal_count / space.proposal_count) }}
                  </div>
                </td>
                <td class="text-right pr-4 align-middle">
                  <h4 class="text-skin-link" v-text="_n(user.vote_count)" />
                  <div class="text-[17px]">
                    {{ _p(user.vote_count / space.vote_count) }}
                  </div>
                </td>
              </tr>
              <template #loading>
                <td colspan="3">
                  <UiLoading class="p-4 block" />
                </td>
              </template>
            </UiContainerInfiniteScroll>
          </tbody>
        </template>
      </table>
    </div>
  </div>
</template>
