<script setup lang="ts">
import { RouteLocationRaw, RouterLink } from 'vue-router';

defineProps<{
  to?: RouteLocationRaw;
}>();

defineEmits<{
  (e: 'click'): void;
}>();
</script>

<template>
  <a
    v-if="typeof to === 'string' && to.startsWith('http')"
    :href="to"
    target="_blank"
    rel="noopener noreferrer"
    @click="$emit('click')"
  >
    <slot />
  </a>
  <RouterLink v-else-if="to" :to="to" @click="$emit('click')">
    <slot />
  </RouterLink>
  <button v-else type="button" @click="$emit('click')">
    <slot />
  </button>
</template>
