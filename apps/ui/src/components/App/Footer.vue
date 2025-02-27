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
  <div
    class="hidden xl:flex fixed bottom-3 pr-4 inset-x-0 max-w-maximum !mx-auto justify-end z-50 pointer-events-none"
  >
    <div class="flex space-x-2 pointer-events-auto">
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
        <a :href="HELPDESK_URL" target="_blank" tabindex="-1">
          <UiButton class="!px-0 w-[46px]">
            <IH-chat class="inline-block" />
          </UiButton>
        </a>
      </UiTooltip>
    </div>
  </div>
</template>
