<script lang="ts" setup>
import { RouteLocationRaw, RouterLinkProps } from 'vue-router';

const props = defineProps<
  Omit<RouterLinkProps, 'to'> & { to?: RouteLocationRaw; isExternal?: boolean }
>();

defineEmits<{
  (e: 'click'): void;
}>();

const router = useAppRouter();

function isExternalLink(to: RouteLocationRaw | undefined): to is string {
  return (typeof to === 'string' && to.startsWith('http')) || props.isExternal;
}

const resolved = computed(() =>
  props.to && !isExternalLink(props.to) ? router.resolve(props.to) : null
);
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
    v-else-if="resolved"
    v-slot="{ isExactActive }"
    :to="resolved.fullPath"
    @click="$emit('click')"
  >
    <slot :is-exact-active="isExactActive" />
  </router-link>
  <button v-else type="button" @click="$emit('click')">
    <slot />
  </button>
</template>
