<script setup lang="ts">
import UiTooltip from './Tooltip.vue';

const props = defineProps<{
  content?: string;
}>();

const wrapperRef = ref<InstanceType<typeof UiTooltip> | null>(null);
const el = computed(() => wrapperRef.value?.$el ?? null);
const { width } = useElementSize(el);

const isTruncated = computed(() => {
  void width.value;
  const dom = el.value;
  if (!dom) return false;
  return dom.scrollWidth > dom.clientWidth;
});

const tooltipContent = computed(() => {
  return props.content || el.value?.textContent || '';
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
