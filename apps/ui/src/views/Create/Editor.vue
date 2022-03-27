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
  <Container class="pt-5 s-compact">
    <h1 v-text="'New proposal'" class="mb-4" />
    <SIString
      v-model="proposals[key].title"
      :definition="{
        type: 'string',
        title: 'Title'
      }"
    />
    <div class="s-base">
      <div v-text="'Description'" class="s-label" />
      <textarea v-model="proposals[key].body" class="s-input mb-3 h-[140px]" />
      <SIString
        v-model="proposals[key].discussion"
        :definition="{
          type: 'string',
          title: 'Discussion',
          examples: ['e.g. https://forum.balancer.fi/t/proposal...']
        }"
      />
    </div>
  </Container>
</template>
