<script setup lang="ts">
import { _n, _p, shorten } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { Space, SpaceMetadataDelegation } from '@/types';

const props = defineProps<{
  space: Space;
  delegation: SpaceMetadataDelegation;
}>();

const delegateModalOpen = ref(false);
const delegateModalState = ref<{ delegatee: string } | null>(null);
const sortBy = ref(
  'delegatedVotes-desc' as
    | 'delegatedVotes-desc'
    | 'delegatedVotes-asc'
    | 'tokenHoldersRepresentedAmount-desc'
    | 'tokenHoldersRepresentedAmount-asc'
);
const { setTitle } = useTitle();
const {
  loading,
  loadingMore,
  loaded,
  failed,
  hasMore,
  delegates,
  fetch,
  fetchMore,
  reset
} = useDelegates(
  props.delegation.apiUrl as string,
  props.delegation.contractAddress as string,
  props.space
);

const currentNetwork = computed(() => {
  if (!props.delegation.contractNetwork) return null;

  try {
    return getNetwork(props.delegation.contractNetwork);
  } catch (e) {
    return null;
  }
});

function handleSortChange(
  type: 'delegatedVotes' | 'tokenHoldersRepresentedAmount'
) {
  if (sortBy.value.startsWith(type)) {
    sortBy.value = sortBy.value.endsWith('desc')
      ? `${type}-asc`
      : `${type}-desc`;
  } else {
    sortBy.value = `${type}-desc`;
  }
}

async function handleEndReached() {
  if (!hasMore.value) return;

  await fetchMore(sortBy.value);
}

function handleDelegateClick(delegatee?: string) {
  delegateModalOpen.value = true;
  delegateModalState.value = delegatee ? { delegatee } : null;
}

onMounted(() => {
  if (!props.delegation.apiUrl) return;

  fetch(sortBy.value);
});

watch([sortBy], () => {
  reset();
  fetch(sortBy.value);
});

watchEffect(() => setTitle(`Delegates - ${props.space.name}`));
</script>

<template>
  <div
    v-if="!currentNetwork || !delegation.apiUrl"
    class="px-4 py-3 flex items-center text-skin-link space-x-2"
  >
    <IH-exclamation-circle class="inline-block" />
    <span>No delegation API configured.</span>
  </div>
  <template v-else>
    <div v-if="delegation.contractAddress" class="p-4 space-x-2 flex">
      <div class="flex-auto" />
      <UiTooltip title="Delegate">
        <UiButton class="!px-0 w-[46px]" @click="handleDelegateClick()">
          <IH-user-add class="inline-block" />
        </UiButton>
      </UiTooltip>
    </div>
    <UiLabel label="Delegates" sticky />
    <div class="text-left table-fixed w-full">
      <div
        class="bg-skin-bg border-b sticky top-[112px] lg:top-[113px] z-40 flex w-full font-medium space-x-3 px-4"
      >
        <div
          class="w-[190px] grow sm:grow-0 sm:shrink-0 flex items-center truncate"
        >
          <span class="truncate">Delegatee</span>
        </div>
        <div class="hidden sm:flex grow items-center truncate">
          <span class="truncate">Statement</span>
        </div>
        <button
          type="button"
          class="hidden md:flex w-[80px] shrink-0 items-center justify-end hover:text-skin-link space-x-1 truncate"
          @click="handleSortChange('tokenHoldersRepresentedAmount')"
        >
          <span class="truncate">Delegators</span>
          <IH-arrow-sm-down
            v-if="sortBy === 'tokenHoldersRepresentedAmount-desc'"
            class="shrink-0"
          />
          <IH-arrow-sm-up
            v-else-if="sortBy === 'tokenHoldersRepresentedAmount-asc'"
            class="shrink-0"
          />
        </button>
        <button
          type="button"
          class="w-[150px] flex sm:shrink-0 justify-end items-center hover:text-skin-link space-x-1 truncate"
          @click="handleSortChange('delegatedVotes')"
        >
          <span class="truncate">Voting power</span>
          <IH-arrow-sm-down
            v-if="sortBy === 'delegatedVotes-desc'"
            class="shrink-0"
          />
          <IH-arrow-sm-up
            v-else-if="sortBy === 'delegatedVotes-asc'"
            class="shrink-0"
          />
        </button>
        <div class="w-[20px]" />
      </div>
      <UiLoading v-if="loading" class="px-4 py-3 block" />
      <template v-else>
        <div
          v-if="loaded && (delegates.length === 0 || failed)"
          class="px-4 py-3 flex items-center space-x-1"
        >
          <IH-exclamation-circle class="inline-block shrink-0" />
          <span v-if="delegates.length === 0">There are no delegates.</span>
          <span v-else-if="failed">Failed to load delegates.</span>
        </div>
        <UiContainerInfiniteScroll
          :loading-more="loadingMore"
          @end-reached="handleEndReached"
        >
          <div
            v-for="(delegate, i) in delegates"
            :key="i"
            class="border-b flex space-x-3 px-4"
          >
            <div
              class="flex grow sm:grow-0 sm:shrink-0 items-center w-[190px] py-3 gap-x-3 truncate"
            >
              <UiStamp :id="delegate.user" :size="32" />
              <router-link
                :to="{
                  name: 'space-user-statement',
                  params: {
                    id: `${space.network}:${space.id}`,
                    user: delegate.user
                  }
                }"
                class="overflow-hidden leading-[22px]"
              >
                <h4
                  class="text-skin-link truncate"
                  v-text="delegate.name || shorten(delegate.user)"
                />
                <div
                  class="text-[17px] text-skin-text truncate"
                  v-text="shorten(delegate.user)"
                />
              </router-link>
            </div>
            <div
              class="hidden sm:flex items-center grow text-[17px] overflow-hidden leading-[22px] text-skin-heading"
            >
              <div
                v-if="delegate.statement"
                class="clamped-text"
                v-text="delegate.statement.statement.slice(0, 130)"
              />
            </div>
            <div
              class="hidden md:flex shrink-0 w-[80px] flex-col items-end justify-center leading-[22px] truncate"
            >
              <h4
                class="text-skin-link"
                v-text="_n(delegate.tokenHoldersRepresentedAmount)"
              />
              <div
                class="text-[17px]"
                v-text="_p(delegate.delegatorsPercentage)"
              />
            </div>
            <div
              class="w-[150px] flex flex-col sm:shrink-0 items-end justify-center leading-[22px] truncate"
            >
              <h4 class="text-skin-link" v-text="_n(delegate.delegatedVotes)" />
              <div class="text-[17px]" v-text="_p(delegate.votesPercentage)" />
            </div>
            <div class="flex items-center justify-center">
              <UiDropdown>
                <template #button>
                  <UiButton class="!p-0 border-0 !h-[auto] bg-transparent">
                    <IH-dots-horizontal class="text-skin-link" />
                  </UiButton>
                </template>
                <template #items>
                  <UiDropdownItem v-slot="{ active }">
                    <button
                      type="button"
                      class="flex items-center gap-2"
                      :class="{ 'opacity-80': active }"
                      @click="handleDelegateClick(delegate.user)"
                    >
                      <IH-user-add />
                      Delegate
                    </button>
                  </UiDropdownItem>
                  <UiDropdownItem v-slot="{ active }">
                    <router-link
                      :to="{
                        name: 'space-user-statement',
                        params: {
                          id: `${space.network}:${space.id}`,
                          user: delegate.user
                        }
                      }"
                      class="flex items-center gap-2"
                      :class="{ 'opacity-80': active }"
                    >
                      <IH-user-circle />
                      View profile
                    </router-link>
                  </UiDropdownItem>
                  <UiDropdownItem v-slot="{ active }">
                    <a
                      :href="
                        currentNetwork.helpers.getExplorerUrl(
                          delegate.user,
                          'address'
                        )
                      "
                      target="_blank"
                      class="flex items-center gap-2"
                      :class="{ 'opacity-80': active }"
                    >
                      <IH-arrow-sm-right class="-rotate-45" />
                      View on block explorer
                    </a>
                  </UiDropdownItem>
                </template>
              </UiDropdown>
            </div>
          </div>
          <template #loading>
            <UiLoading class="px-4 py-3 block" />
          </template>
        </UiContainerInfiniteScroll>
      </template>
    </div>

    <teleport to="#modal">
      <ModalDelegate
        :open="delegateModalOpen"
        :space="space"
        :delegation="delegation"
        :initial-state="delegateModalState"
        @close="delegateModalOpen = false"
      />
    </teleport>
  </template>
</template>

<style scoped>
.clamped-text {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
