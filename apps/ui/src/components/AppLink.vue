<script lang="ts" setup>
import { RouteLocationRaw, RouterLinkProps } from 'vue-router';

defineOptions({
  inheritAttrs: false
});

const props = defineProps<RouterLinkProps>();

const { isWhiteLabel } = useWhiteLabel();

function normalize(to: RouteLocationRaw) {
  if (
    !isWhiteLabel.value ||
    typeof to === 'string' ||
    !('name' in to) ||
    !to.name
  )
    return to;

  if (to.name.toString().startsWith('space-')) {
    delete to.params?.space;
  }

  if (to.name.toString() === 'user') {
    to.name = 'space-user-statement';
  }

  if (to.name.toString() === 'settings-spaces') {
    to.name = 'settings-contacts';
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
