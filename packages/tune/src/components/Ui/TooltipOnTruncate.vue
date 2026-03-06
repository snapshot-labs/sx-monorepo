<script setup lang="ts">
import UiTooltip from './Tooltip.vue';

const props = defineProps<{
  content?: string;
}>();

const wrapperRef = ref<InstanceType<typeof UiTooltip> | null>(null);
const isTruncated = ref(false);

const tooltipContent = computed(() => {
  return props.content || wrapperRef.value?.$el?.textContent || '';
});

const checkTruncation = () => {
  const el = wrapperRef.value?.$el;
  if (!el) return;
  isTruncated.value = el.scrollWidth > el.clientWidth;
};

const debouncedCheckTruncation = useDebounceFn(checkTruncation, 50);

useResizeObserver(
  computed(() => wrapperRef.value?.$el ?? null),
  debouncedCheckTruncation
);

watchEffect(() => {
  if (wrapperRef.value) {
    checkTruncation();
  }
});
</script>

<template>
  <UiTooltip
    ref="wrapperRef"
    :title="isTruncated ? tooltipContent : ''"
    class="truncate"
  >
    <slot>{{ content }}</slot>
  </UiTooltip>
</template>
