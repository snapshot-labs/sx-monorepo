<script setup lang="ts">
defineProps<{
  open: boolean;
  space: { name: string; terms: string };
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'accept'): void;
}>();

function handleAgreeClick() {
  emit('close');
  emit('accept');
}
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-text="'Terms of service'" />
    </template>
    <div class="p-4">
      Before continuing, please read and agree to {{ space.name }}
      <a :href="space.terms" target="_blank">terms of service</a>.
    </div>
    <template #footer>
      <UiButton class="w-full" @click="handleAgreeClick">Agree</UiButton>
    </template>
  </UiModal>
</template>
