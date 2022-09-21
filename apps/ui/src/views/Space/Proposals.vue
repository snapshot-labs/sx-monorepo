<script setup lang="ts">
import { onMounted, ref, Ref } from 'vue';
import apollo from '@/helpers/apollo';
import { PROPOSALS_QUERY } from '@/helpers/queries';
import { Space, Proposal as ProposalType } from '@/types';

const props = defineProps<{ space: Space }>();

const proposals: Ref<ProposalType[]> = ref([]);
const loaded: Ref<boolean> = ref(false);

onMounted(async () => {
  const { data } = await apollo.query({
    query: PROPOSALS_QUERY,
    variables: {
      first: 24,
      space: props.space.id
    }
  });
  proposals.value = data.proposals;
  loaded.value = true;
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
            <IH-plus-sm class="inline-block" />
          </UiButton>
        </router-link>
      </div>
    </div>
    <Label :label="'Proposals'" />
    <UiLoading v-if="!loaded" class="block px-4 py-3" />
    <div v-else>
      <div v-if="!proposals.length" class="px-4 py-3 text-skin-link">
        <IH-exclamation-circle class="inline-block mr-2" />
        <span v-text="'There are no proposals here.'" />
      </div>
      <Proposal
        v-for="(proposal, i) in proposals"
        :key="i"
        :proposal="proposal"
      />
    </div>
  </div>
</template>
