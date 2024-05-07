<script setup lang="ts">
import { _n, shorten } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { Space, SpaceMetadataDelegation } from '@/types';

const props = defineProps<{ space: Space; delegation: SpaceMetadataDelegation }>();

const { web3 } = useWeb3();

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
  delegators,
  fetch,
  fetchMore,
  reset,
  tab
} = useDelegates(props.delegation.apiUrl as string, props.delegation.contractNetwork as string);

const currentNetwork = computed(() => {
  if (!props.delegation.contractNetwork) return null;

  try {
    return getNetwork(props.delegation.contractNetwork);
  } catch (e) {
    return null;
  }
});

const isDelegatesTab = computed(() => tab.value === 'delegates');
const dataToDisplay = computed(() =>
  isDelegatesTab.value
    ? {
        header: 'Delegatee',
        noData: 'There are no delegates.',
        data: delegates.value,
        failMessage: 'Failed to load delegates.'
      }
    : {
        header: 'Delegator',
        noData: 'You have no delegators.',
        data: delegators.value,
        failMessage: 'Failed to load delegators.'
      }
);

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
        <div class="flex pl-4 border-b space-x-3 sticky z-10 top-[71px] lg:top-[72px] bg-skin-bg">
          <button type="button" @click="tab = 'delegates'">
            <UiLink :is-active="isDelegatesTab" text="Delegates" />
          </button>
          <button v-if="web3.account" type="button" @click="tab = 'my-delegators'">
            <UiLink :is-active="tab === 'my-delegators'" text="My Delegators" />
          </button>
        </div>

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
                <span class="relative bottom-[1px]">
                  {{ isDelegatesTab ? 'Delegatee' : 'Delegator' }}
                </span>
              </th>
              <th v-if="isDelegatesTab" class="hidden md:table-cell">
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
              <th :colspan="isDelegatesTab ? 1 : 2">
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
                v-if="loaded && dataToDisplay.data.length === 0"
                class="px-4 py-3 flex items-center"
                colspan="3"
              >
                <IH-exclamation-circle class="inline-block mr-2" />
                {{ dataToDisplay.noData }}
              </td>
              <td v-else-if="loaded && failed" class="px-4 py-3 flex items-center" colspan="3">
                <IH-exclamation-circle class="inline-block mr-2" />
                {{ dataToDisplay.failMessage }}
              </td>
              <UiContainerInfiniteScroll
                :loading-more="loadingMore"
                @end-reached="handleEndReached"
              >
                <tr v-for="(delegate, i) in dataToDisplay.data" :key="i" class="border-b relative">
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
                  <td v-if="isDelegatesTab" class="hidden md:table-cell align-middle text-right">
                    <h4
                      class="text-skin-link"
                      v-text="_n(delegate.tokenHoldersRepresentedAmount)"
                    />
                    <div
                      class="text-[17px]"
                      v-text="`${delegate.delegatorsPercentage.toFixed(3)}%`"
                    />
                  </td>
                  <td class="text-right pr-4 align-middle" :colspan="isDelegatesTab ? 1 : 2">
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
