<script setup>
import { useRoute } from 'vue-router';
import spaces from '@/helpers/spaces.json';

const route = useRoute();
const id = route.params.id;
const space = spaces[id];
</script>

<template>
  <div class="relative bg-skin-border h-[140px] -mb-[70px]">
    <div class="absolute right-4 top-4 space-x-2">
      <router-link :to="{ name: 'create' }">
        <UiButton class="!px-0 w-[46px]">
          <Icon name="plus" class="mt-1" />
        </UiButton>
      </router-link>
    </div>
  </div>
  <Container>
    <div class="text-center mb-4 relative">
      <Stamp
        :id="space.address"
        :size="90"
        class="mb-2 border-[3px] border-skin-bg !bg-skin-bg"
      />
      <h1>{{ space.name }}</h1>
      <div>
        <b class="text-skin-link">{{ space.proposals }}</b> proposals
      </div>
    </div>
    <Nav class="mb-3" />
  </Container>
  <router-view :space="space" />
</template>
