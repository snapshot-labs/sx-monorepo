<script setup lang="ts">
import { Toast, toast, ToastRegion } from '@ui-sdk/vue/toast';
import type { NotificationType } from '../../types';
</script>

<template>
  <!-- Shows every toast from UI SDK's `toast()`, newest at the bottom -->
  <ToastRegion
    side="bottom"
    align="center"
    expanded
    :max-visible="Infinity"
    class="inset-x-0 bottom-4 [translate:none] pointer-events-none [&>ol]:flex [&>ol]:flex-col-reverse [&>ol]:gap-2"
  >
    <template #default="{ toast: item }">
      <Toast>
        <UiAlert
          :type="item.type as NotificationType"
          dismissible
          class="!w-fit max-w-[90%] mx-auto pointer-events-auto"
          @close="toast.dismiss(item.id)"
        >
          {{ item.title }}
        </UiAlert>
      </Toast>
    </template>
  </ToastRegion>
</template>
