<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useProposalsStore } from '@/stores/proposals';
import type { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const proposalsStore = useProposalsStore();

const proposalsRecord = computed(
  () => proposalsStore.proposals[`${props.space.network}:${props.space.id}`]
);

async function handleEndReached() {
  if (!proposalsRecord.value?.hasMoreProposals) return;

  proposalsStore.fetchMore(props.space.id, props.space.network);
}

onMounted(() => {
  proposalsStore.fetch(props.space.id, props.space.network);
});
</script>

<template>
  <div>
    <div class="flex">
      <div class="flex-auto" />
      <div class="p-4 space-x-2">
        <a>
          <UiButton class="!px-0 w-[46px]">
            <IH-lightning-bolt class="inline-block" />
          </UiButton>
        </a>
        <router-link :to="{ name: 'editor' }">
          <UiButton class="!px-0 w-[46px]">
            <IH-pencil-alt class="inline-block" />
          </UiButton>
        </router-link>
      </div>
    </div>
    <ProposalsList
      title="Proposals"
      limit="off"
      :loading="!proposalsRecord?.loaded"
      :loading-more="proposalsRecord?.loadingMore"
      :proposals="proposalsStore.getSpaceProposals(props.space.id, props.space.network)"
      @end-reached="handleEndReached"
    />
  </div>
</template>
