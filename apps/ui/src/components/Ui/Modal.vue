<script setup lang="ts">
const emit = defineEmits<{
  (e: 'close');
}>();

const props = withDefaults(
  defineProps<{
    open: boolean;
    closeable?: boolean;
  }>(),
  {
    closeable: true
  }
);

const { open } = toRefs(props);
const { modalOpen } = useModal();

function handleKeyboardEvent(ev: KeyboardEvent) {
  if (ev.code === 'Escape') emit('close');
}

onMounted(() => {
  document.addEventListener('keyup', handleKeyboardEvent);
});

onBeforeUnmount(() => {
  document.removeEventListener('keyup', handleKeyboardEvent);
  modalOpen.value = false;
});

watch(open, val => {
  modalOpen.value = val;
});
</script>

<template>
  <transition name="fade">
    <div v-if="open" class="modal">
      <UiBackdrop @click="closeable ? $emit('close') : null" />
      <div class="shell">
        <div v-if="$slots.header" class="border-b py-3 text-center">
          <slot name="header" />
        </div>
        <div class="modal-body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="border-t p-4 text-center">
          <slot name="footer" />
        </div>
        <button
          v-if="closeable"
          type="button"
          class="absolute right-0 -top-1 p-4"
          @click="$emit('close')"
        >
          <IH-x />
        </button>
      </div>
    </div>
  </transition>
</template>

<style lang="scss" scoped>
.modal {
  @apply absolute flex items-center justify-center mx-auto inset-0 z-[51];

  .shell {
    @apply relative bg-skin-bg md:border md:rounded-lg shadow-lg px-0 my-0 mx-auto flex flex-col z-[999] md:max-w-[440px] max-w-full max-h-full min-h-full w-full md:max-h-[calc(100vh-120px)] md:min-h-0;
  }

  &-body {
    @apply max-h-[420px] md:max-w-full flex-auto overflow-y-auto overflow-x-hidden;
  }
}
</style>
