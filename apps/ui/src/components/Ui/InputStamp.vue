<script setup lang="ts">
import { getUrl, imageUpload } from '@/helpers/utils';

const model = defineModel<string>();

defineProps<{
  error?: string;
  definition: any;
}>();

const uiStore = useUiStore();

const fileInput = ref<HTMLInputElement | null>(null);
const isUploadingImage = ref(false);

const imgUrl = computed(() => {
  if (!model.value) return undefined;
  if (model.value.startsWith('ipfs://')) return getUrl(model.value);
  return model.value;
});

function openFilePicker() {
  if (isUploadingImage.value) return;
  fileInput.value?.click();
}

async function handleFileChange(e: Event) {
  try {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) throw new Error('File not found');
    isUploadingImage.value = true;

    const image = await imageUpload(file);
    if (!image) throw new Error('Image not uploaded');

    model.value = image.url;
    isUploadingImage.value = false;
  } catch (e) {
    uiStore.addNotification('error', 'Failed to upload image.');

    console.error('Failed to upload image', e);
    isUploadingImage.value = false;
  }
}
</script>

<template>
  <button
    type="button"
    v-bind="$attrs"
    class="relative group max-w-max cursor-pointer mb-3 border-4 border-skin-bg rounded-lg overflow-hidden bg-skin-border"
    @click="openFilePicker()"
  >
    <img
      v-if="imgUrl"
      :src="imgUrl"
      class="size-[80px] object-cover group-hover:opacity-80"
      :class="{
        'opacity-80': isUploadingImage
      }"
    />
    <UiStamp
      v-else
      :id="definition.default"
      :size="80"
      class="pointer-events-none !rounded-none group-hover:opacity-80"
      type="space"
      :class="{
        'opacity-80': isUploadingImage
      }"
    />
    <div
      class="pointer-events-none absolute group-hover:visible inset-0 z-10 flex flex-row size-full items-center content-center justify-center"
    >
      <UiLoading v-if="isUploadingImage" class="block z-10" />
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
