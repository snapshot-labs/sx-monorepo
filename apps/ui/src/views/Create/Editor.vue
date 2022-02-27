<script setup>
import { ref } from 'vue';

const input = ref({});
</script>
<template>
  <Layout>
    <h1 class="mb-4">New proposal</h1>
    <SIString
      v-model="input.title"
      :definition="{
        type: 'string',
        title: 'Title'
      }"
    />
    <div class="s-label">Description</div>
    <textarea class="s-input mb-3 h-[120px]" />
    <SIString
      v-model="input.discussion"
      :definition="{
        type: 'string',
        title: 'Discussion',
        examples: ['e.g. https://forum.balancer.fi/t/proposal...']
      }"
    />
  </Layout>
</template>
