<script setup lang="ts">
import { watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEditor } from '@/composables/useEditor';
import { omit } from '@/helpers/utils';

const router = useRouter();
const route = useRoute();
const { proposals } = useEditor();

const id = route.params.id;
const draft = route.params.key;
const key = `${id}:${draft}`;

if (!proposals[key]) {
  proposals[key] = {
    title: '',
    body: '',
    discussion: '',
    execution: [],
    updatedAt: Date.now()
  };
}

if (!proposals[key].execution) proposals[key].execution = [];

watch(proposals, () => {
  if (!proposals[key]) {
    router.push({ name: 'editor' });
  }
});

const proposalData = computed(() =>
  JSON.stringify(omit(proposals[key], ['updatedAt']))
);

watch(proposalData, () => {
  proposals[key].updatedAt = Date.now();
});
</script>
<template>
  <Container v-if="proposals[key]" class="pt-5 s-box">
    <h4 class="eyebrow mb-3">Context</h4>
    <SIString
      v-model="proposals[key].title"
      :definition="{
        type: 'string',
        title: 'Title'
      }"
    />
    <div class="s-base mb-5">
      <div class="s-label" v-text="'Description'" />
      <textarea
        v-model="proposals[key].body"
        maxlength="280"
        class="s-input mb-3 h-[160px]"
      />
      <SIString
        v-model="proposals[key].discussion"
        :definition="{
          type: 'string',
          title: 'Discussion',
          examples: ['e.g. https://forum.balancer.fi/t/proposal…']
        }"
      />
      <Preview :url="proposals[key].discussion" />
    </div>
    <h4 class="eyebrow mb-3">Execution</h4>
    <BlockExecutionEditable v-model="proposals[key].execution" class="mb-4" />
  </Container>
</template>
