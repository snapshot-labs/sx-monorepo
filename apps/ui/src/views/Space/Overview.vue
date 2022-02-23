<script setup>
import spaces from '@/helpers/spaces.json';

defineProps({ space: Object });
</script>

<template>
  <Container class="pb-6">
    <div v-if="space.parent" class="border rounded-lg mb-3">
      <router-link
        :to="{ name: 'overview', params: { id: space.parent } }"
        class="px-4 py-3 border-b last:border-0 block"
      >
        <h4>
          <Icon name="back" class="mr-1" />
          {{ spaces[space.parent].name }}
        </h4>
      </router-link>
    </div>
    <div v-if="space.spaces" class="border rounded-lg mb-3">
      <router-link
        v-for="s in space.spaces"
        :key="s"
        :to="{ name: 'overview', params: { id: s } }"
        class="px-4 py-3 border-b last:border-0 block"
      >
        <h4>
          {{ spaces[s].name }}
          <UiCounter :counter="spaces[s].proposals" class="float-right mt-1" />
        </h4>
      </router-link>
    </div>
  </Container>
</template>
