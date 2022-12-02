<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useProposalsStore } from '@/stores/proposals';
import type { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const proposalsStore = useProposalsStore();

onMounted(() => {
  proposalsStore.fetchAll(props.space.id);
});

const proposalsRecord = computed(() => proposalsStore.proposals[props.space.id]);
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
            <IH-plus-sm class="inline-block" />
          </UiButton>
        </router-link>
      </div>
    </div>
    <ProposalsList
      title="Proposals"
      limit="off"
      :loading="!proposalsRecord?.loaded"
      :proposals="proposalsRecord?.proposals || []"
    />
  </div>
</template>
