<script lang="ts" setup>
import { RouterLink, RouterLinkProps } from 'vue-router';

defineOptions({
  inheritAttrs: false
});

const props = defineProps<{ button?: boolean } & RouterLinkProps>();

const isExternalLink = computed(
  () => typeof props.to === 'string' && props.to.startsWith('http')
);

// NOTE cleanup and use correct link when it's a white label site
function normalize(to: any) {
  return to;
}
</script>

<template>
  <a
    v-if="isExternalLink"
    v-bind="$attrs"
    :href="to as string"
    target="_blank"
    class="inline-flex items-center"
    :class="{
      button: button
    }"
  >
    <slot />
    <IH-arrow-sm-right class="-rotate-45 shrink-0" />
  </a>
  <router-link
    v-else
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
  @apply rounded-full leading-[100%] border px-3.5 h-[46px] text-skin-link bg-skin-bg inline-flex items-center justify-center gap-2;

  &.primary {
    @apply bg-skin-link text-skin-bg border-skin-link;
  }
}
</style>
