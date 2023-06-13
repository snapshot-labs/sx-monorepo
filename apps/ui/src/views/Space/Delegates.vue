<script setup lang="ts">
import { _n, shorten } from '@/helpers/utils';
import { getNetwork } from '@/networks';
import { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const { setTitle } = useTitle();
const { loading, loadingMore, loaded, failed, hasMore, delegates, fetch, fetchMore } = useDelegates(
  props.space.delegation_api_url as string
);

const currentNetwork = computed(() => {
  if (!props.space.wallet) return null;

  try {
    return getNetwork(props.space.network);
  } catch (e) {
    return null;
  }
});

async function handleEndReached() {
  if (!hasMore.value) return;

  await fetchMore();
}

onMounted(() => {
  if (!props.space.delegation_api_url) return;

  fetch();
});

watchEffect(() => {
  setTitle(`Delegates - ${props.space.name}`);
});
</script>

<template>
  <div
    v-if="!currentNetwork || !space.delegation_api_url"
    class="p-4 flex items-center text-skin-link"
  >
    <IH-exclamation-circle class="inline-block mr-2" />
    No delegation API configured.
  </div>
  <template v-else>
    <div class="p-4 space-x-2 flex">
      <div class="flex-auto" />
      <UiTooltip title="Delegate">
        <UiButton class="!px-0 w-[46px]">
          <IH-user-add class="inline-block" />
        </UiButton>
      </UiTooltip>
    </div>
    <div class="space-y-3">
      <div>
        <Label label="Delegates" sticky />
        <UiLoading v-if="loading && !loaded" class="px-4 py-3 block" />
        <div
          v-else-if="loaded && delegates.length === 0"
          class="px-4 py-3 flex items-center text-skin-link"
        >
          <IH-exclamation-circle class="inline-block mr-2" />
          There are no delegates.
        </div>
        <div v-else-if="failed" class="px-4 py-3 flex items-center text-skin-link">
          <IH-exclamation-circle class="inline-block mr-2" />
          Failed to load delegates.
        </div>
        <BlockInfiniteScroller :loading-more="loadingMore" @end-reached="handleEndReached">
          <a
            v-for="delegate in delegates"
            :key="delegate.id"
            :href="currentNetwork.helpers.getExplorerUrl(delegate.id, 'address')"
            target="_blank"
            class="flex justify-between items-center mx-4 py-3 border-b text-skin-text"
          >
            <Stamp :id="delegate.id" type="avatar" :size="32" class="mr-3" />
            <div class="flex-1 leading-[22px]">
              <h4 class="text-skin-link" v-text="delegate.name || shorten(delegate.id)" />
              <div class="text-sm" v-text="shorten(delegate.id)" />
            </div>
            <div
              class="flex-col items-end text-right leading-[22px] w-auto md:w-[180px] hidden md:block"
            >
              <h4
                class="text-skin-link"
                v-text="`${_n(delegate.tokenHoldersRepresentedAmount)} delegator(s)`"
              />
              <div class="text-sm" v-text="`${delegate.delegatorsPercentage.toFixed(3)}%`" />
            </div>
            <div class="flex-col items-end text-right leading-[22px] w-auto md:w-[180px]">
              <h4 class="text-skin-link" v-text="_n(delegate.delegatedVotes)" />
              <div class="text-sm" v-text="`${delegate.votesPercentage.toFixed(3)}%`" />
            </div>
          </a>
        </BlockInfiniteScroller>
      </div>
    </div>
  </template>
</template>
