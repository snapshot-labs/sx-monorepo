<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useProposalsStore } from '@/stores/proposals';
import type { Space } from '@/types';

const props = defineProps<{ space: Space }>();

const proposalsStore = useProposalsStore();

onMounted(() => {
  proposalsStore.fetchAll(props.space.id);
});

const proposalsRecord = computed(
  () => proposalsStore.proposals[props.space.id]
);
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
    <Label :label="'Proposals'" />
    <UiLoading v-if="!proposalsRecord?.loaded" class="block px-4 py-3" />
    <div v-else>
      <div
        v-if="!proposalsRecord?.proposals.length"
        class="px-4 py-3 text-skin-link"
      >
        <IH-exclamation-circle class="inline-block mr-2" />
        <span v-text="'There are no proposals here.'" />
      </div>
      <Proposal
        v-for="(proposal, i) in proposalsRecord?.proposals"
        :key="i"
        :proposal="proposal"
      />
    </div>
  </div>
</template>
