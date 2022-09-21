<script setup>
import { onMounted, ref } from 'vue';
import apollo from '@/helpers/apollo';
import { SPACES_QUERY } from '@/helpers/queries';

const spaces = ref([]);
const loaded = ref(false);

onMounted(async () => {
  const { data } = await apollo.query({ query: SPACES_QUERY });
  spaces.value = data.spaces;
  loaded.value = true;
});
</script>

<template>
  <div class="w-[72px] border-r fixed left-0 top-0 bottom-0 text-center">
    <router-link :to="{ name: 'home' }" class="h-[72px] block">
      <IH-stop class="inline-block my-4 w-[32px] h-[32px] text-skin-link" />
    </router-link>
    <UiLoading v-if="!loaded" class="block py-2" />
    <div v-else class="space-y-3 p-2">
      <router-link
        v-for="(space, i) in spaces"
        :key="i"
        :to="{ name: 'overview', params: { id: space.id } }"
        class="block"
      >
        <Stamp :id="space.id" :size="32" class="!rounded-[4px]" />
      </router-link>
    </div>
  </div>
</template>
