<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { shortenAddress } from '@/helpers/utils';

const route = useRoute();
const id = route.params.id;

const loaded = ref(true);
</script>

<template>
  <UiLoading v-if="!loaded" class="block text-center p-4" />
  <div v-else>
    <div class="relative bg-skin-border h-[140px] -mb-[70px]" />
    <Container slim>
      <div class="text-center mb-4 relative">
        <Stamp
          :id="id"
          :size="90"
          class="mb-2 border-[3px] border-skin-bg !bg-skin-bg"
        />
        <h1>{{ shortenAddress(id) }}</h1>
      </div>
    </Container>
  </div>
</template>
