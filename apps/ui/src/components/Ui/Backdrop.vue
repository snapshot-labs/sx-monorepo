<script setup lang="ts">
const emit = defineEmits<{
  (e: 'close');
}>();

function handleKeyboardEvent(ev: KeyboardEvent) {
  if (ev.code === 'Escape') emit('close');
}

onMounted(() => {
  document.addEventListener('keyup', handleKeyboardEvent);
});

onBeforeUnmount(() => {
  document.removeEventListener('keyup', handleKeyboardEvent);
});
</script>

<template>
  <button
    type="button"
    class="absolute inset-0 z-[99] bg-[black]/40"
    @click="emit('close')"
  />
</template>
