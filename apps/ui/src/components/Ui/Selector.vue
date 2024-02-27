<script setup lang="ts">
defineProps<{
  isActive?: boolean;
}>();
</script>

<template>
  <button
    type="button"
    class="border rounded-xl p-2.5 flex gap-3 text-left"
    :class="{ 'border-skin-content bg-skin-input-bg': isActive }"
  >
    <slot />
    <div class="w-[20px] text-right text-skin-link">
      <IH-check v-if="isActive" />
    </div>
  </button>
</template>
