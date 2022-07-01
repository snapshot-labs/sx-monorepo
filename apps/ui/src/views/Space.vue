<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import apollo from '@/helpers/apollo';
import { SPACE_QUERY } from '@/helpers/queries';
import { useState } from '@/composables/useState';

const route = useRoute();
const { get, set } = useState();
const id = route.params.id;

const space = ref({});
const loaded = ref(false);

onMounted(async () => {
  const state = get();
  if (state?.spaces[id]) {
    space.value = state.spaces[id];
  } else {
    const { data } = await apollo.query({
      query: SPACE_QUERY,
      variables: { id }
    });
    state.spaces[id] = data.space;
    space.value = data.space;
    set(state);
  }
  loaded.value = true;
});
</script>

<template>
  <UiLoading v-if="!loaded" class="block text-center p-4" />
  <div v-else>
    <div class="relative bg-skin-border h-[140px] -mb-[70px]">
      <div class="absolute right-4 top-4 space-x-2">
        <router-link :to="{ name: 'editor' }">
          <UiButton class="!px-0 w-[46px]">
            <IH-plus-sm class="inline-block" />
          </UiButton>
        </router-link>
      </div>
    </div>
    <Container slim>
      <div class="text-center mb-4 relative">
        <router-link :to="{ name: 'overview' }">
          <Stamp
            :id="space.id"
            :size="90"
            class="mb-2 border-[4px] border-skin-bg !bg-skin-bg rounded-lg"
          />
        </router-link>
        <h1 v-text="space.name" />
        <div>
          <b class="text-skin-link">{{ space.proposal_count }}</b> proposals ·
          <b class="text-skin-link">{{ space.vote_count }}</b> votes
        </div>
      </div>
      <Nav class="mb-3" />
    </Container>
    <router-view :space="space" />
  </div>
</template>
