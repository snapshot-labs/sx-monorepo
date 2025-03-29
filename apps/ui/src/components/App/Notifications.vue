<script lang="ts" setup>
const uiStore = useUiStore();
</script>

<template>
  <div class="absolute bottom-4 inset-x-0 space-y-2">
    <UiAlert
      v-for="notification in uiStore.notifications"
      :key="notification.id"
      dismissible
      :type="notification.type"
      class="!w-fit max-w-[90%] mx-auto"
      @close="uiStore.dismissNotification(notification.id)"
    >
      {{ notification.message }}
    </UiAlert>
  </div>
</template>
