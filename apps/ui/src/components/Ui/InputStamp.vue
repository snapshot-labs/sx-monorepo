<script setup lang="ts">
import {
  getUrl,
  getUserFacingErrorMessage,
  imageUpload,
  resizeImage
} from '@/helpers/utils';

const model = defineModel<string>();

const props = withDefaults(
  defineProps<{
    error?: string;
    definition: any;
    width?: number;
    height?: number;
    disabled?: boolean;
    fallback?: boolean;
    cropped?: boolean;
    type?: 'avatar' | 'space';
  }>(),
  {
    width: 80,
    height: 80,
    fallback: true,
    cropped: true,
    type: 'avatar'
  }
);

const uiStore = useUiStore();

const fileInput = ref<HTMLInputElement | null>(null);
const isPreviewImageWorking = ref(false);
const previewImageUrl = ref<string | null>(null);

function openFilePicker() {
  if (isPreviewImageWorking.value) return;
  fileInput.value?.click();
}

async function handleFileChange(e: Event) {
  try {
    const file = (e.target as HTMLInputElement).files?.[0];

    isPreviewImageWorking.value = true;

    const image = await imageUpload(file as File);
    if (!image) throw new Error('Failed to upload image.');

    model.value = image.url;
    isPreviewImageWorking.value = false;
  } catch (e) {
    uiStore.addNotification('error', getUserFacingErrorMessage(e));

    console.error('Failed to upload image', e);

    if (fileInput.value) {
      fileInput.value.value = '';
    }
    isPreviewImageWorking.value = false;
  }
}

onUnmounted(() => {
  if (previewImageUrl.value) {
    URL.revokeObjectURL(previewImageUrl.value);
  }
});

watch(
  model,
  async () => {
    const oldUrl = previewImageUrl.value;

    try {
      if (!model.value?.startsWith('ipfs://')) {
        previewImageUrl.value = null;
        return;
      }

      isPreviewImageWorking.value = true;

      const imageUrl = getUrl(model.value);
      if (!imageUrl) {
        previewImageUrl.value = null;
        return uiStore.addNotification(
          'error',
          getUserFacingErrorMessage(new Error('Unable to render image preview'))
        );
      }

      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Failed to fetch image');

      const blob = await response.blob();
      const file = new File([blob], 'image', { type: blob.type });

      const resizedFile = await resizeImage(file, props.width, props.height);
      previewImageUrl.value = URL.createObjectURL(resizedFile);
    } catch (error) {
      uiStore.addNotification('error', getUserFacingErrorMessage(error));
      console.error('Failed to resize image:', error);
      previewImageUrl.value = null;
    } finally {
      if (oldUrl) {
        URL.revokeObjectURL(oldUrl);
      }
      isPreviewImageWorking.value = false;
    }
  },
  { immediate: true }
);
</script>

<template>
  <button
    type="button"
    v-bind="$attrs"
    class="relative group max-w-max cursor-pointer mb-3 border-4 border-skin-bg rounded-lg overflow-hidden bg-skin-border"
    :disabled="disabled || isPreviewImageWorking"
    :class="{ '!cursor-not-allowed': disabled || isPreviewImageWorking }"
    :style="{
      'max-width': `${width}px`,
      height: `${height}px`,
      width: '100%'
    }"
    @click="openFilePicker()"
  >
    <img
      v-if="previewImageUrl"
      :src="previewImageUrl"
      alt="Uploaded avatar"
      :class="[
        `object-cover group-hover:opacity-80`,
        {
          'opacity-80': isPreviewImageWorking
        }
      ]"
    />
    <UiStamp
      v-else-if="fallback && !model"
      :id="definition.default"
      :width="width"
      :height="height"
      :cropped="cropped"
      class="pointer-events-none !rounded-none group-hover:opacity-80"
      :type="type"
      :class="{
        'opacity-80': isPreviewImageWorking
      }"
    />
    <div v-else class="block w-full h-full" />
    <div
      class="pointer-events-none absolute group-hover:visible inset-0 z-10 flex flex-row size-full items-center content-center justify-center"
    >
      <UiLoading v-if="isPreviewImageWorking" class="block z-10" />
      <IH-pencil v-else class="invisible text-skin-link group-hover:visible" />
    </div>
  </button>
  <input
    ref="fileInput"
    type="file"
    accept="image/jpg, image/jpeg, image/png"
    class="hidden"
    @change="handleFileChange"
  />
</template>

<style lang="scss" scoped>
button:disabled {
  @apply cursor-not-allowed;
}
</style>
