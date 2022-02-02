<script setup>
import { useNotifications } from '@/composables/useNotifications';

const { items } = useNotifications();
</script>

<template>
  <div
    class="fixed left-0 right-0 bottom-0 z-50 flex flex-col items-center mb-4 space-y-2 pointer-events-none"
  >
    <transition-group name="fade">
      <div v-for="item in items" :key="item.id" class="pointer-events-auto">
        <UiButton
          class="notification flex items-center space-x-2 !border-none"
          :class="`!bg-${item.type}`"
          @click="item.remove()"
        >
          <span>{{ item.message }}</span>
        </UiButton>
      </div>
    </transition-group>
  </div>
</template>
