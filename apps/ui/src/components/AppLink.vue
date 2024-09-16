<script lang="ts" setup>
import { RouterLink } from 'vue-router';

defineOptions({
  inheritAttrs: false
});

defineProps({
  // @ts-ignore
  ...RouterLink.props,
  inactiveClass: String
});

// NOTE cleanup and use correct link when it's a white label site
function normalize(to: any) {
  return to;
}
</script>

<template>
  <router-link
    v-slot="{ isActive, href, navigate }"
    v-bind="$props"
    :to="normalize($props.to)"
    custom
  >
    <a
      v-bind="$attrs"
      :href="href"
      :class="isActive ? activeClass : inactiveClass"
      @click="navigate"
    >
      <slot />
    </a>
  </router-link>
</template>
