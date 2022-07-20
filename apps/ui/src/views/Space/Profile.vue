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
    <form class="s-box" @submit.prevent>
      <SIString
        v-model="name"
        :definition="{
          type: 'string',
          title: 'Name'
        }"
      />
      <div class="s-base">
        <div class="s-label" v-text="'Description'" />
        <textarea
          v-model="about"
          maxlength="280"
          class="s-input mb-3 h-[120px]"
        />
      </div>
      <SIString
        v-model="discussions"
        :definition="{
          type: 'string',
          title: 'Discussions',
          examples: ['e.g. https://forum.balancer.fi']
        }"
      />
    </form>
  </Container>
</template>
