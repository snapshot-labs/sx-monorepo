<script lang="ts" setup>
import { RouteLocationRaw, RouterLinkProps } from 'vue-router';

const props = defineProps<
  Omit<RouterLinkProps, 'to'> & { to?: RouteLocationRaw }
>();

const { isWhiteLabel } = useWhiteLabel();

function normalize(to: RouteLocationRaw) {
  if (
    !isWhiteLabel.value ||
    typeof to === 'string' ||
    !('name' in to) ||
    !to.name
  ) {
    return to;
  }

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
  <router-link v-if="props.to" :to="normalize(props.to)">
    <slot />
  </router-link>
  <div v-else>
    <slot />
  </div>
</template>
