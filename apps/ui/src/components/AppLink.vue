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
    :class="{ 'gap-1': !hideExternalIcon }"
    @click="$emit('click')"
  >
    <slot />
    <IH-arrow-sm-right
      v-if="!hideExternalIcon"
      class="-rotate-45 inline-block shrink-0 -mb-0.5 -mt-0.5"
    />
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
