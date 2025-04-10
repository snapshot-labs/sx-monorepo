<script lang="ts" setup>
import { RouteLocationRaw, RouterLinkProps } from 'vue-router';

const props = defineProps<
  Omit<RouterLinkProps, 'to'> & { to?: RouteLocationRaw; external?: boolean }
>();

const { isWhiteLabel } = useWhiteLabel();
const router = useRouter();

function isExternalLink(to: RouteLocationRaw | undefined): to is string {
  return (typeof to === 'string' && to.startsWith('http')) || props.external;
}

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

function normalizeExternalize(to: RouteLocationRaw | string): string {
  if (typeof to === 'string') {
    return to;
  }

  return new URL(router.resolve(to).href, window.location.origin).href;
}
</script>

<template>
  <a
    v-if="isExternalLink(props.to)"
    :href="normalizeExternalize(props.to)"
    target="_blank"
  >
    <slot />
  </a>
  <router-link v-else-if="props.to" :to="normalize(props.to)">
    <slot />
  </router-link>
  <div v-else>
    <slot />
  </div>
</template>
