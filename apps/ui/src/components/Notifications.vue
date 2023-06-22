<script lang="ts" setup>
import { useUiStore } from '@/stores/ui';

const uiStore = useUiStore();
</script>

<template>
  <div class="fixed bottom-4 left-0 right-0 z-[52]">
    <UiAlert
      v-for="notification in uiStore.notifications"
      :key="notification.id"
      dismissable
      :type="notification.type"
      class="w-fit max-w-[90%] mx-auto mb-2 last:mb-0"
      @close="uiStore.dismissNotification(notification.id)"
    >
      {{ notification.message }}
    </UiAlert>
  </div>
</template>
