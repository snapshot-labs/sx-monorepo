<script setup lang="ts">
import { HELPDESK_URL } from '@/helpers/constants';

const { isWhiteLabel, resolved } = useWhiteLabel();
const route = useRoute();
const { chatbotOpen, openChatbot, context } = useChatbot();

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
      <UiTooltip v-if="context?.purpose" title="Ask AI">
        <UiButton class="!px-0 w-[46px]" @click="openChatbot()">
          <IH-sparkles class="inline-block" />
        </UiButton>
      </UiTooltip>
      <UiTooltip
        v-if="resolved && !isWhiteLabel && !isSiteRoute"
        title="About Snapshot"
      >
        <UiButton :to="{ name: 'site-landing' }" uniform>
          <IH-question-mark-circle class="size-[24px]" />
        </UiButton>
      </UiTooltip>
      <UiTooltip title="Get help">
        <UiButton :to="HELPDESK_URL" uniform>
          <IH-chat />
        </UiButton>
      </UiTooltip>
    </div>
  </div>

  <Chatbot v-if="chatbotOpen" @close="chatbotOpen = false" />
</template>
