<script setup>
import { ref } from 'vue';

const props = defineProps({
  space: Object
});

const name = ref(props.space.name || '');
const about = ref(props.space.about || '');
</script>
<template>
  <Container>
    <h2 class="mb-3">Profile</h2>
    <SIString
      :definition="{
        type: 'string',
        title: 'Name'
      }"
      v-model="name"
    />
    <SIString
      :definition="{
        type: 'string',
        title: 'About'
      }"
      v-model="about"
    />
  </Container>
</template>
