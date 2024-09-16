<script lang="ts" setup>
import { RouterLink, RouterLinkProps } from 'vue-router';

defineOptions({
  inheritAttrs: false
});

defineProps<{ button?: boolean } & RouterLinkProps>();

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
      :class="{
        [activeClass!]: isActive && activeClass,
        button: button
      }"
      @click="navigate"
    >
      <slot />
    </a>
  </router-link>
</template>

<style lang="scss" scoped>
.button {
  @apply rounded-full leading-[100%] border px-3.5 h-[46px] text-skin-link bg-skin-bg inline-flex items-center justify-center;

  &.primary {
    @apply bg-skin-link text-skin-bg border-skin-link;
  }
}
</style>
