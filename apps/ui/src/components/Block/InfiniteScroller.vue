<script setup lang="ts">
import { ref, watch, onBeforeUnmount, Ref } from 'vue';

defineProps<{
  loadingMore?: boolean;
}>();

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

watch(container, v => {
  if (!v) return;

  mutationObserver.observe(v, { childList: true });
  updateIntersectionObserver();
});

onBeforeUnmount(() => {
  mutationObserver.disconnect();
  intersectionObserver.disconnect();
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
