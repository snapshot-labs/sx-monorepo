<script lang="ts" setup>
import { RouterLinkProps } from 'vue-router';

defineOptions({
  inheritAttrs: false
});

const props = defineProps<RouterLinkProps>();

// NOTE cleanup and use correct link when it's a white label site
function normalize(to: any) {
  return to;
}
</script>

<template>
  <router-link
    v-slot="{ isActive, href, navigate }"
    v-bind="props"
    :to="normalize(props.to)"
    custom
  >
    <a
      v-bind="$attrs"
      :href="href"
      :class="{
        [activeClass!]: isActive && activeClass
      }"
      @click="navigate"
    >
      <slot />
    </a>
  </router-link>
</template>
