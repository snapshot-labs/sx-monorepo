<script setup lang="ts">
import { loadImageFromIpfs, resizeImage } from '@/helpers/utils';

const props = defineProps<{
  src?: string | null;
  width: number;
  height: number;
  alt: string;
}>();

const previewImageUrl = ref<string | null>(null);

onUnmounted(() => {
  if (previewImageUrl.value) {
    URL.revokeObjectURL(previewImageUrl.value);
  }
});

watch(
  () => props.src,
  async () => {
    const oldUrl = previewImageUrl.value;

    try {
      if (!props.src?.startsWith('ipfs://')) {
        previewImageUrl.value = null;
        return;
      }

      const file = await loadImageFromIpfs(props.src);
      const resizedFile = await resizeImage(file, props.width, props.height);
      previewImageUrl.value = URL.createObjectURL(resizedFile);
    } catch (error) {
      console.error('Failed to load image preview', error);
      previewImageUrl.value = null;
    } finally {
      if (oldUrl) {
        URL.revokeObjectURL(oldUrl);
      }
    }
  },
  { immediate: true }
);
</script>

<template>
  <img
    v-if="previewImageUrl"
    :src="previewImageUrl"
    :alt="alt"
    v-bind="$attrs"
  />
</template>
