<script setup>
import { useEditor } from '@/composables/useEditor';
import { useRoute } from 'vue-router';

const route = useRoute();
const { proposals } = useEditor();

const id = route.params.id;
const draft = route.params.key;
const key = `${id}:${draft}`;
if (!proposals[key]) proposals[key] = {};
</script>
<template>
  <Container class="pt-5 s-box">
    <h4 class="eyebrow mb-3">Context</h4>
    <SIString
      v-model="proposals[key].title"
      :definition="{
        type: 'string',
        title: 'Title'
      }"
    />
    <div class="s-base mb-5">
      <div v-text="'Description'" class="s-label" />
      <textarea
        v-model="proposals[key].body"
        maxlength="280"
        class="s-input mb-3 h-[120px]"
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
    <BlockExecutionEditable class="mb-4" />
  </Container>
</template>
