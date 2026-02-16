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
        <UiButton :to="{ name: 'site-landing' }" uniform>
          <IH-question-mark-circle class="size-[24px]" />
        </UiButton>
      </UiTooltip>
      <UiTooltip title="Get help">
        <UiButton :to="HELPDESK_URL" uniform hide-external-icon>
          <IH-chat />
        </UiButton>
      </UiTooltip>
    </div>
  </div>
</template>
