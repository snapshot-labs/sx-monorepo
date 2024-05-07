<script setup lang="ts">
const props = defineProps<{
  open: boolean;
}>();

defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-text="'Stake lido'" />
    </template>
    <div class="p-4 flex flex-column">Content</div>
  </UiModal>
</template>
