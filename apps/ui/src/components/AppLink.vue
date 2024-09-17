<script lang="ts" setup>
import { RouteLocationRaw, RouterLinkProps } from 'vue-router';

defineOptions({
  inheritAttrs: false
});

const props = defineProps<RouterLinkProps>();

const { isWhiteLabel } = useWhiteLabel();

// NOTE cleanup and use correct link when it's a white label site
function normalize(to: RouteLocationRaw) {
  if (!isWhiteLabel.value || typeof to === 'string') return to;

  if ('name' in to && to.name?.toString().startsWith('space-')) {
    delete to.params?.space;
  }

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
      :class="{ [`${activeClass}`]: isActive }"
      @click="navigate"
    >
      <slot />
    </a>
  </router-link>
</template>
