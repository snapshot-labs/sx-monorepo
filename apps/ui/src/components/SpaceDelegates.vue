<script setup lang="ts">
import { _n, _p, shorten } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { Space, SpaceMetadataDelegation } from '@/types';

const props = defineProps<{
  space: Space;
  delegation: SpaceMetadataDelegation;
}>();

const delegateModalOpen = ref(false);
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
  props.delegation.contractAddress as string
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
        <UiButton class="!px-0 w-[46px]" @click="delegateModalOpen = true">
          <IH-user-add class="inline-block" />
        </UiButton>
      </UiTooltip>
    </div>
    <UiLabel label="Delegates" sticky />
    <div class="text-left table-fixed w-full">
      <div
        class="bg-skin-bg border-b sticky top-[112px] lg:top-[113px] z-40 flex w-full font-medium space-x-1"
      >
        <div class="pl-4 w-[60%] flex items-center truncate">Delegatee</div>
        <button
          type="button"
          class="hidden md:flex w-[20%] items-center justify-end hover:text-skin-link space-x-1 truncate"
          @click="handleSortChange('tokenHoldersRepresentedAmount')"
        >
          <span>Delegators</span>
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
          class="w-[40%] md:w-[20%] flex justify-end items-center hover:text-skin-link pr-4 space-x-1 truncate"
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
            class="border-b flex space-x-1"
          >
            <div class="flex items-center w-[60%] pl-4 py-3 gap-x-3 truncate">
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
              class="hidden md:flex w-[20%] flex-col items-end justify-center leading-[22px] truncate"
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
              class="w-[40%] md:w-[20%] flex flex-col items-end justify-center pr-4 leading-[22px] truncate"
            >
              <h4 class="text-skin-link" v-text="_n(delegate.delegatedVotes)" />
              <div class="text-[17px]" v-text="_p(delegate.votesPercentage)" />
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
        @close="delegateModalOpen = false"
      />
    </teleport>
  </template>
</template>
