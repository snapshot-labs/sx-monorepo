<script setup lang="ts">
import { _n, shorten } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { Space, SpaceMetadataDelegation } from '@/types';

const props = defineProps<{ space: Space; delegation: SpaceMetadataDelegation }>();

const delegateModalOpen = ref(false);
const sortBy = ref(
  'delegatedVotes-desc' as
    | 'delegatedVotes-desc'
    | 'delegatedVotes-asc'
    | 'tokenHoldersRepresentedAmount-desc'
    | 'tokenHoldersRepresentedAmount-asc'
);
const { setTitle } = useTitle();
const { loading, loadingMore, loaded, failed, hasMore, delegates, fetch, fetchMore, reset } =
  useDelegates(props.delegation.apiUrl as string);

const currentNetwork = computed(() => {
  if (!props.delegation.contractNetwork) return null;

  try {
    return getNetwork(props.delegation.contractNetwork);
  } catch (e) {
    return null;
  }
});

function handleSortChange(type: 'delegatedVotes' | 'tokenHoldersRepresentedAmount') {
  if (sortBy.value.startsWith(type)) {
    sortBy.value = sortBy.value.endsWith('desc') ? `${type}-asc` : `${type}-desc`;
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
  <div v-if="!currentNetwork || !delegation.apiUrl" class="p-4 flex items-center text-skin-link">
    <IH-exclamation-circle class="inline-block mr-2" />
    No delegation API configured.
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
    <div class="space-y-3">
      <div>
        <UiLabel label="Delegates" sticky />

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
                <span class="relative bottom-[1px]">Delegatee</span>
              </th>
              <th class="hidden md:table-cell">
                <button
                  class="relative bottom-[1px] flex items-center justify-end min-w-0 w-full font-medium hover:text-skin-link"
                  @click="handleSortChange('tokenHoldersRepresentedAmount')"
                >
                  <span>Delegators</span>
                  <IH-arrow-sm-down
                    v-if="sortBy === 'tokenHoldersRepresentedAmount-desc'"
                    class="ml-1"
                  />
                  <IH-arrow-sm-up
                    v-else-if="sortBy === 'tokenHoldersRepresentedAmount-asc'"
                    class="ml-1"
                  />
                </button>
              </th>
              <th>
                <button
                  class="relative bottom-[1px] flex justify-end items-center min-w-0 w-full font-medium hover:text-skin-link pr-4"
                  @click="handleSortChange('delegatedVotes')"
                >
                  <span class="truncate">Voting power</span>
                  <IH-arrow-sm-down v-if="sortBy === 'delegatedVotes-desc'" class="ml-1" />
                  <IH-arrow-sm-up v-else-if="sortBy === 'delegatedVotes-asc'" class="ml-1" />
                </button>
              </th>
            </tr>
          </thead>
          <td v-if="loading" colspan="3">
            <UiLoading class="px-4 py-3 block" />
          </td>
          <template v-else>
            <tbody>
              <td
                v-if="loaded && delegates.length === 0"
                class="px-4 py-3 flex items-center"
                colspan="3"
              >
                <IH-exclamation-circle class="inline-block mr-2" />
                There are no delegates.
              </td>
              <td v-else-if="loaded && failed" class="px-4 py-3 flex items-center" colspan="3">
                <IH-exclamation-circle class="inline-block mr-2" />
                Failed to load delegates.
              </td>
              <UiContainerInfiniteScroll
                :loading-more="loadingMore"
                @end-reached="handleEndReached"
              >
                <tr v-for="(delegate, i) in delegates" :key="i" class="border-b relative">
                  <td class="text-left flex items-center pl-4 py-3">
                    <UiStamp :id="delegate.id" :size="32" class="mr-3" />
                    <div class="overflow-hidden">
                      <a
                        :href="currentNetwork.helpers.getExplorerUrl(delegate.id, 'address')"
                        target="_blank"
                      >
                        <div class="leading-[22px]">
                          <h4
                            class="text-skin-link truncate"
                            v-text="delegate.name || shorten(delegate.id)"
                          />
                          <div
                            class="text-[17px] text-skin-text truncate"
                            v-text="shorten(delegate.id)"
                          />
                        </div>
                      </a>
                    </div>
                  </td>
                  <td class="hidden md:table-cell align-middle text-right">
                    <h4
                      class="text-skin-link"
                      v-text="_n(delegate.tokenHoldersRepresentedAmount)"
                    />
                    <div
                      class="text-[17px]"
                      v-text="`${delegate.delegatorsPercentage.toFixed(3)}%`"
                    />
                  </td>
                  <td class="text-right pr-4 align-middle">
                    <h4 class="text-skin-link" v-text="_n(delegate.delegatedVotes)" />
                    <div class="text-[17px]" v-text="`${delegate.votesPercentage.toFixed(3)}%`" />
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
