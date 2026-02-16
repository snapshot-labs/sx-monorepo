<script lang="ts" setup>
import { RouteLocationRaw, RouterLinkProps } from 'vue-router';

const props = defineProps<
  Omit<RouterLinkProps, 'to'> & {
    to?: RouteLocationRaw;
    isExternal?: boolean;
    hideExternalIcon?: boolean;
  }
>();

defineEmits<{
  (e: 'click'): void;
}>();

const { isWhiteLabel } = useWhiteLabel();
const router = useRouter();

function isExternalLink(to: RouteLocationRaw | undefined): to is string {
  return (typeof to === 'string' && to.startsWith('http')) || props.isExternal;
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
    :class="{ 'inline-flex items-center gap-1': !hideExternalIcon }"
    @click="$emit('click')"
  >
    <template v-if="!hideExternalIcon">
      <span class="inline-flex items-center"><slot /></span>
      <IH-arrow-sm-right class="-rotate-45 shrink-0" />
    </template>
    <slot v-else />
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
