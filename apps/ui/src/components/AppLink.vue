<script lang="ts" setup>
import { RouteLocationRaw, RouterLinkProps } from 'vue-router';

const props = defineProps<
  Omit<RouterLinkProps, 'to'> & { to?: RouteLocationRaw; isExternal?: boolean }
>();

defineEmits<{
  (e: 'click'): void;
}>();

const router = useAppRouter();
const route = useRoute();

function isExternalLink(to: RouteLocationRaw | undefined): to is string {
  return (typeof to === 'string' && to.startsWith('http')) || props.isExternal;
}

const resolved = computed(() =>
  props.to && !isExternalLink(props.to) ? router.resolve(props.to) : null
);

const isPathActive = computed(() => {
  if (!resolved.value) return false;

  const linkPath = resolved.value.path;
  return route.path === linkPath || route.path.startsWith(`${linkPath}/`);
});
</script>

<template>
  <a
    v-if="isExternalLink(to)"
    :href="to"
    target="_blank"
    rel="noopener noreferrer"
    @click="$emit('click')"
  >
    <slot />
  </a>
  <router-link
    v-else-if="to"
    v-slot="{ isActive: isRouteActive, isExactActive }"
    :to="resolved!.fullPath"
    @click="$emit('click')"
  >
    <slot
      :is-active="isRouteActive || isPathActive"
      :is-exact-active="isExactActive"
    />
  </router-link>
  <button v-else type="button" @click="$emit('click')">
    <slot />
  </button>
</template>
