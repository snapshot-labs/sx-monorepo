<script setup lang="ts">
withDefaults(
  defineProps<{
    gradient: false | 'sm' | 'md';
  }>(),
  { gradient: false }
);
</script>

<template>
  <div class="relative">
    <div
      v-if="gradient"
      class="bg-gradient-to-r from-skin-bg left-0 top-[1px] bottom-[1px] absolute z-10 pointer-events-none"
      :class="{
        'w-2': gradient === 'sm',
        'w-3': gradient === 'md'
      }"
    />
    <div class="overflow-x-auto no-scrollbar">
      <div data-no-sidebar-swipe>
        <slot />
      </div>
    </div>
    <div
      v-if="gradient"
      class="bg-gradient-to-l from-skin-bg right-0 top-[1px] bottom-[1px] absolute z-10 pointer-events-none"
      :class="{
        'w-2': gradient === 'sm',
        'w-3': gradient === 'md'
      }"
    />
  </div>
</template>
