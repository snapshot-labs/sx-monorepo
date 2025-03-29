<script setup lang="ts">
import { HELPDESK_URL } from '@/helpers/constants';

const { isWhiteLabel, resolved } = useWhiteLabel();
const route = useRoute();

const isSiteRoute = computed(() => {
  if (typeof route.name === 'string') {
    return route.name.startsWith('site-');
  }

  return false;
});
</script>

<template>
  <div class="hidden xl:flex absolute bottom-3 right-4 space-x-2">
    <UiTooltip
      v-if="resolved && !isWhiteLabel && !isSiteRoute"
      title="About Snapshot"
    >
      <router-link :to="{ name: 'site-landing' }" tabindex="-1">
        <UiButton class="!px-0 w-[46px]">
          <IC-zap class="inline-block size-[24px]" />
        </UiButton>
      </router-link>
    </UiTooltip>
    <UiTooltip title="Get help">
      <AppLink :to="HELPDESK_URL" tabindex="-1">
        <UiButton class="!px-0 w-[46px]">
          <IH-chat class="inline-block" />
        </UiButton>
      </AppLink>
    </UiTooltip>
  </div>
</template>
