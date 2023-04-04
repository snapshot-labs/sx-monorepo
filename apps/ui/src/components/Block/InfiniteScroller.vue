<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    enabled?: boolean;
    loadingMore?: boolean;
  }>(),
  { enabled: true, loadingMore: false }
);

const emit = defineEmits<{
  (e: 'endReached');
}>();

const container: Ref<HTMLElement | null> = ref(null);

function updateIntersectionObserver() {
  if (!container.value) return;
  if (container.value.children.length === 0) return;

  const lastElement = container.value.children[container.value.children.length - 1];

  intersectionObserver.observe(lastElement);
}

function cleanup() {
  mutationObserver.disconnect();
  intersectionObserver.disconnect();
}

const intersectionObserver = new IntersectionObserver(
  ([entry]) => {
    if (!entry.isIntersecting) return;

    intersectionObserver.unobserve(entry.target);
    emit('endReached');
  },
  {
    rootMargin: '200px'
  }
);

const mutationObserver = new MutationObserver(() => {
  updateIntersectionObserver();
});

watch([container, () => props.enabled], ([ref, enabled]) => {
  if (!enabled) {
    return cleanup();
  }

  if (!ref) return;

  mutationObserver.observe(ref, { childList: true });
  updateIntersectionObserver();
});

onBeforeUnmount(() => {
  cleanup();
});
</script>

<template>
  <div>
    <div ref="container">
      <slot />
    </div>
    <slot v-if="loadingMore" name="loading">
      <div class="flex justify-center">
        <UiLoading class="block px-4 py-3" />
      </div>
    </slot>
  </div>
</template>
