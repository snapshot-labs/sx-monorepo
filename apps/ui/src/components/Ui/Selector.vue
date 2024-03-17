<script setup lang="ts">
defineProps<{
  isActive?: boolean;
}>();
</script>

<template>
  <button
    type="button"
    class="border rounded-xl py-2.5 px-3 flex gap-3 text-left relative"
    :class="{ 'border-skin-content': isActive }"
  >
    <slot />
    <div class="w-[20px] text-right text-skin-link absolute right-3 top-3">
      <IH-check v-if="isActive" />
    </div>
  </button>
</template>
