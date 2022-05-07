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
    <div class="py-7 mb-6 border-b">
      <Container class="max-w-screen-md">
        <div v-text="'Snapshot X'" class="eyebrow mb-3" />
        <h1 class="mb-5 mono">Where decisions<br />get made.</h1>
      </Container>
    </div>
    <Container class="max-w-screen-md">
      <h3 v-text="'Spaces'" class="mb-2" />
      <UiLoading v-if="!loaded" class="block mb-2" />
    </Container>
    <Container v-if="loaded" class="max-w-screen-md" slim>
      <div class="x-block mb-3">
        <router-link
          v-for="space in spaces"
          :key="space.id"
          :to="{ name: 'overview', params: { id: space.id } }"
          class="p-4 text-skin-text border-b last:border-b-0 block"
        >
          <div class="mb-2 flex items-center space-x-2">
            <Stamp
              :id="space.id"
              :size="24"
              class="inline-block border-skin-bg !bg-skin-bg"
            />
            <h4 v-text="space.name" class="inline-block" />
          </div>
          <div>
            <b class="text-skin-link">{{ space.proposal_count }}</b> proposals ·
            <b class="text-skin-link">{{ space.vote_count }}</b> votes
          </div>
        </router-link>
      </div>
    </Container>
    <Container class="max-w-screen-md">
      <router-link
        :to="{ name: 'editor', params: { id: spaces[0]?.id || '0' } }"
        class="mb-2 block"
      >
        <h3 v-text="'Editor'" />
      </router-link>
      <a
        href="https://github.com/snapshot-labs?q=sx&type=all&language=&sort="
        target="_blank"
        class="mb-2 block"
      >
        <h3>
          GitHub
          <IH-external-link class="inline-block" />
        </h3>
      </a>
    </Container>
  </div>
</template>
