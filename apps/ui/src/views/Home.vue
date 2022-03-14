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
  <div>
    <div class="border-b py-7 mb-6">
      <Container class="max-w-screen-md">
        <div class="eyebrow mb-3">Snapshot X</div>
        <h1 class="mb-5 mono">Where decisions<br />get made.</h1>
      </Container>
    </div>
    <Container class="max-w-screen-md">
      <h3 class="mb-2">Spaces</h3>
      <UiLoading v-if="!loaded" class="block mb-2" />
      <router-link
        v-else
        v-for="space in spaces"
        :key="space.id"
        :to="{ name: 'overview', params: { id: space.id } }"
      >
        <div class="mb-2">{{ space.name }}</div>
      </router-link>
      <router-link :to="{ name: 'editor', params: { id: 'pasta' } }">
        <h3 class="mb-2">Editor</h3>
      </router-link>
      <router-link :to="{ name: 'playground' }">
        <h3 class="mb-2">Playground</h3>
      </router-link>
      <a
        href="https://github.com/snapshot-labs?q=sx&type=all&language=&sort="
        target="_blank"
      >
        <h3 class="mb-2">GitHub <Icon name="external-link" /></h3>
      </a>
    </Container>
  </div>
</template>
