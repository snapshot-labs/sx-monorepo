<script lang="ts" setup>
import { RouterLinkProps } from 'vue-router';

const props = defineProps<RouterLinkProps>();

// NOTE cleanup and use correct link when it's a white label site
function normalize(to: any) {
  return to;
}
</script>

<template>
  <router-link :to="normalize(props.to)">
    <slot />
  </router-link>
</template>
