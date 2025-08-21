<script setup lang="ts">
import { getUrl, imageUpload } from '@/helpers/utils';
import { NetworkID } from '@/types';

const model = defineModel<string | null>();

const props = defineProps<{
  space?: {
    id: string;
    cover: string;
    avatar: string;
    network: NetworkID;
  };
  user?: {
    id: string;
    cover?: string;
    avatar?: string;
  };
  error?: string;
}>();

const uiStore = useUiStore();

const fileInput = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);

function openFilePicker() {
  if (isUploading.value) return;
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
    isUploading.value = false;
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
    :disabled="isUploading"
    class="relative block bg-skin-border h-[140px] mb-[-50px] w-full overflow-hidden cursor-pointer group"
    :class="{ '!cursor-not-allowed': isUploading }"
    @click="openFilePicker()"
  >
    <UiImagePreview
      v-if="model"
      :src="model"
      :width="SPACE_COVER_DIMENSIONS.lg.width"
      :height="SPACE_COVER_DIMENSIONS.lg.height"
      alt="Cover image"
      class="size-full object-cover group-hover:opacity-80"
      :class="{
        'opacity-80': isUploading
      }"
    />
    <SpaceCover
      v-else-if="props.space?.cover"
      :space="props.space"
      class="pointer-events-none group-hover:opacity-80"
    />
    <UserCover
      v-else-if="props.user?.cover"
      :user="props.user"
      class="pointer-events-none !rounded-none min-h-full group-hover:opacity-80"
    />

    <div
      class="pointer-events-none absolute group-hover:visible inset-0 z-10 flex flex-row size-full items-center content-center justify-center"
    >
      <UiLoading v-if="isUploading" class="block z-10" />
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
