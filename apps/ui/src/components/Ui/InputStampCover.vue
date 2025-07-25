<script setup lang="ts">
import { SPACE_COVER_DIMENSIONS } from '@/helpers/constants';
import {
  getUrl,
  getUserFacingErrorMessage,
  imageUpload,
  resizeImage
} from '@/helpers/utils';
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

      const imageUrl = getUrl(model.value);
      if (!imageUrl) {
        previewImageUrl.value = null;
        return uiStore.addNotification(
          'error',
          getUserFacingErrorMessage(new Error('Unable to render image preview'))
        );
      }

      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'image', { type: blob.type });

      // Resize the image
      const resizedFile = await resizeImage(
        file,
        SPACE_COVER_DIMENSIONS.lg.width,
        SPACE_COVER_DIMENSIONS.lg.height
      );
      previewImageUrl.value = URL.createObjectURL(resizedFile);
    } catch (error) {
      console.error('Failed to resize image:', error);
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
  <button
    type="button"
    v-bind="$attrs"
    :disabled="isPreviewImageWorking"
    class="relative block bg-skin-border h-[140px] mb-[-50px] w-full overflow-hidden cursor-pointer group"
    :class="{ '!cursor-not-allowed': isPreviewImageWorking }"
    @click="openFilePicker()"
  >
    <img
      v-if="previewImageUrl"
      alt=""
      :src="previewImageUrl"
      class="size-full object-cover group-hover:opacity-80"
      :class="{
        'opacity-80': isPreviewImageWorking
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
