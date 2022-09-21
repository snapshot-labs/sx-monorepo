<script setup>
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import apollo from '@/helpers/apollo';
import { SPACE_QUERY } from '@/helpers/queries';
import { useState } from '@/composables/useState';

const route = useRoute();
const { get, set } = useState();
const id = route.params.id;

let space = $ref({});
let loaded = $ref(false);

onMounted(async () => {
  const state = get();
  if (state?.spaces[id]) {
    space = state.spaces[id];
  } else {
    const { data } = await apollo.query({
      query: SPACE_QUERY,
      variables: { id }
    });
    state.spaces[id] = data.space;
    space = data.space;
    set(state);
  }
  loaded = true;
});
</script>

<template>
  <div>
    <div
      class="invisible lg:visible fixed w-[240px] border-r top-0 bottom-0 z-10 bg-skin-bg"
    >
      <div class="h-[72px] border-b" />
      <Nav />
    </div>
    <div>
      <div class="ml-0 lg:ml-[240px] mr-0 xl:mr-[240px]">
        <UiLoading v-if="!loaded" class="block p-4" />
        <router-view v-else :space="space" />
      </div>
      <div
        class="invisible xl:visible fixed w-[240px] border-l bottom-0 top-[72px] right-0"
      />
    </div>
  </div>
</template>
