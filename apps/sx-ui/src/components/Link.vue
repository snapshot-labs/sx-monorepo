<script setup lang="ts">
defineProps<{
  text: string;
  isActive: boolean;
}>();
</script>

<template>
  <h4
    class="eyebrow py-2 cursor-pointer"
    :class="[isActive ? 'text-skin-link' : 'text-skin-text']"
    v-text="text"
  />
</template>
