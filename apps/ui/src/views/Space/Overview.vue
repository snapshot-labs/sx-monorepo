<script setup>
import { onMounted, ref } from 'vue';
import apollo from '@/helpers/apollo';
import { PROPOSALS_QUERY } from '@/helpers/queries';
import spaces from '@/helpers/spaces.json';

const proposals = ref([]);
const loaded = ref(false);

onMounted(async () => {
  const { data } = await apollo.query({
    query: PROPOSALS_QUERY,
    variables: { first: 6 }
  });
  proposals.value = data.proposals;
  loaded.value = true;
});

defineProps({ space: Object });
</script>

<template>
  <Container slim class="space-y-3">
    <div v-if="space.parent" class="x-block">
      <router-link
        :to="{ name: 'overview', params: { id: space.parent } }"
        class="px-4 py-3 border-b last:border-0 block"
      >
        <h4>
          <IH-arrow-narrow-left class="inline-block mr-1" />
          {{ spaces[space.parent].name }}
        </h4>
      </router-link>
    </div>
    <div v-if="space.spaces" class="x-block">
      <router-link
        v-for="s in space.spaces"
        :key="s"
        :to="{ name: 'overview', params: { id: s } }"
        class="px-4 py-3 border-b last:border-0 block"
      >
        <h4>
          {{ spaces[s].name }}
          <UiCounter :counter="spaces[s].proposals" class="float-right mt-1" />
        </h4>
      </router-link>
    </div>
    <UiLoading v-if="!loaded" class="block px-4 sm:px-0" />
    <Proposal
      v-else
      v-for="(proposal, i) in proposals"
      :key="i"
      :proposal="proposal"
      class="mb-3"
    />
  </Container>
</template>
