<script lang="ts" setup>
const uiStore = useUiStore();
</script>

<template>
  <div class="fixed bottom-4 inset-x-0 z-[52] pointer-events-none">
    <UiAlert
      v-for="notification in uiStore.notifications"
      :key="notification.id"
      dismissible
      :type="notification.type"
      class="!w-fit max-w-[90%] mx-auto mb-2 last:mb-0 pointer-events-auto"
      @close="uiStore.dismissNotification(notification.id)"
    >
      {{ notification.message }}
    </UiAlert>
  </div>
</template>
