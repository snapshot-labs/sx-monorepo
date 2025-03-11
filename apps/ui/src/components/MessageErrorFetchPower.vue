<script setup lang="ts">
defineProps<{
  type: 'proposition' | 'voting';
}>();

defineEmits<{
  (e: 'fetch');
}>();
</script>

<template>
  <div class="flex flex-col gap-3 items-start" v-bind="$attrs">
    <UiAlert type="error">
      There was an error fetching your
      {{ type === 'voting' ? 'voting power' : 'proposal validation' }}.
    </UiAlert>
    <UiButton
      type="button"
      class="flex items-center gap-2"
      @click="$emit('fetch')"
    >
      <IH-refresh />Retry
    </UiButton>
  </div>
</template>
