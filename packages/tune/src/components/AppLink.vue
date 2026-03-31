<script lang="ts" setup>
import type { RouteLocationRaw, RouterLinkProps } from 'vue-router';
import { useRouter } from '../composables/useRouter';

const props = defineProps<
  Omit<RouterLinkProps, 'to'> & { to?: RouteLocationRaw; isExternal?: boolean }
>();

defineEmits<{
  (e: 'click'): void;
}>();

const router = useRouter();

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
    v-slot="{ isActive, isExactActive }"
    :to="resolved.fullPath"
    @click="$emit('click')"
  >
    <slot :is-active="isActive" :is-exact-active="isExactActive" />
  </router-link>
  <button v-else type="button" @click="$emit('click')">
    <slot />
  </button>
</template>
