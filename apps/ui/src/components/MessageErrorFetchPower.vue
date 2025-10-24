<script setup lang="ts">
const props = defineProps<{
  type: 'proposition' | 'voting' | 'vote-validation';
}>();

defineEmits<{
  (e: 'fetch');
}>();

const typeName = computed(() => {
  if (props.type === 'voting') return 'voting power';
  if (props.type === 'proposition') return 'proposal validation';
  if (props.type === 'vote-validation') return 'vote validation';
  throw new Error('Unknown type');
});
</script>

<template>
  <div class="flex flex-col gap-3 items-start" v-bind="$attrs">
    <UiAlert type="error">
      There was an error fetching your {{ typeName }}.
    </UiAlert>
    <UiButton @click="$emit('fetch')"> <IH-refresh />Retry </UiButton>
  </div>
</template>
