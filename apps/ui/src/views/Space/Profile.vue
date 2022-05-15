<script setup>
import { ref } from 'vue';

const props = defineProps({
  space: Object
});

const name = ref(props.space.name || '');
const about = ref(props.space.about || '');
const discussions = ref(props.space.discussions || '');
</script>
<template>
  <Container>
    <h2 class="mb-3">Profile</h2>
    <form @submit.prevent class="s-box">
      <SIString
        :definition="{
          type: 'string',
          title: 'Name'
        }"
        v-model="name"
      />
      <div class="s-base">
        <div v-text="'Description'" class="s-label" />
        <textarea
          v-model="about"
          maxlength="280"
          class="s-input mb-3 h-[120px]"
        />
      </div>
      <SIString
        :definition="{
          type: 'string',
          title: 'Discussions',
          examples: ['e.g. https://forum.balancer.fi']
        }"
        v-model="discussions"
      />
    </form>
  </Container>
</template>
