<script lang="ts" setup>
import { RouteLocationRaw, RouterLinkProps } from 'vue-router';
import {
  NamedRouteLocationRaw,
  resolveOrgRoute
} from '@/helpers/organizations';

const props = defineProps<
  Omit<RouterLinkProps, 'to'> & { to?: RouteLocationRaw; isExternal?: boolean }
>();

defineEmits<{
  (e: 'click'): void;
}>();

const { isWhiteLabel } = useWhiteLabel();
const { organization } = useOrganization();
const router = useRouter();

function isExternalLink(to: RouteLocationRaw | undefined): to is string {
  return (typeof to === 'string' && to.startsWith('http')) || props.isExternal;
}

function normalize(to: RouteLocationRaw) {
  if (typeof to === 'string' || !('name' in to) || !to.name) {
    return to;
  }

  if (organization.value) {
    return resolveOrgRoute(organization.value, to as NamedRouteLocationRaw);
  }

  if (!isWhiteLabel.value) {
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

function resolveToUrl(to: RouteLocationRaw | string): string {
  if (typeof to === 'string') {
    return to;
  }

  return router.resolve(to).href;
}
</script>

<template>
  <a
    v-if="isExternalLink(props.to)"
    :href="resolveToUrl(props.to)"
    target="_blank"
    rel="noopener noreferrer"
    @click="$emit('click')"
  >
    <slot />
  </a>
  <router-link
    v-else-if="props.to"
    :to="normalize(props.to)"
    @click="$emit('click')"
  >
    <slot />
  </router-link>
  <button v-else type="button" @click="$emit('click')">
    <slot />
  </button>
</template>
