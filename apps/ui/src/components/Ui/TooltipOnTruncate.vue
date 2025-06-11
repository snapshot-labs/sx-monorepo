<script setup lang="ts">
const props = defineProps<{
  content?: string;
}>();

const wrapper = ref<HTMLElement | null>(null);
const isTruncated = ref(false);

const tooltipContent = computed(() => {
  return props.content || wrapper.value?.textContent || '';
});

const checkTruncation = () => {
  if (!wrapper.value) return;
  isTruncated.value = wrapper.value.scrollWidth > wrapper.value.clientWidth;
};

const debouncedCheckTruncation = useDebounceFn(checkTruncation, 300);

let resizeObserver: ResizeObserver | null = null;

const setupResizeObserver = (element: HTMLElement) => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }

  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(debouncedCheckTruncation);
    resizeObserver.observe(element);
  }
};

watchEffect(() => {
  if (wrapper.value) {
    checkTruncation();
    setupResizeObserver(wrapper.value);
  }
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
</script>

<template>
  <div
    ref="wrapper"
    v-tippy="{
      content: isTruncated ? tooltipContent : null
    }"
    class="inline-block relative grow truncate"
  >
    <slot>{{ content }}</slot>
  </div>
</template>
