<script setup>
import { ref } from 'vue';

const step = ref(0);
</script>
<template>
  <div class="x-block rounded-lg mb-4">
    <a @click="step = 1" class="px-4 py-3 block border-b">
      <h4>
        <Icon name="go" class="float-right mt-1" />
        Transfer funds
      </h4>
    </a>
    <div v-if="step === 1" class="px-4 py-3 border-b">
      <SIString
        :definition="{
          type: 'string',
          title: 'To'
        }"
      />
      <SIString
        :definition="{
          type: 'number',
          title: 'Amount'
        }"
      />
    </div>
    <a class="px-4 py-3 block border-b">
      <h4>
        <Icon name="go" class="float-right mt-1" />
        Transfer collectible
      </h4>
    </a>
    <a class="px-4 py-3 block">
      <h4>
        <Icon name="go" class="float-right mt-1" />
        Contract interaction
      </h4>
    </a>
  </div>
</template>
