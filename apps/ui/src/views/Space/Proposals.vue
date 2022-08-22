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
  <Container slim class="space-y-3">
    <UiLoading v-if="!loaded" class="block px-4 sm:px-0" />
    <Proposal
      v-for="(proposal, i) in proposals"
      v-else
      :key="i"
      :proposal="proposal"
    />
  </Container>
</template>
