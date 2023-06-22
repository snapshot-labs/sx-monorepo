<script setup lang="ts">
import { useUiStore } from '@/stores/ui';
import { getUrl, imageUpload } from '@/helpers/utils';

const props = defineProps<{
  space?: {
    id: string;
    cover: string;
  };
  modelValue?: string | null;
  error?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string);
}>();

const uiStore = useUiStore();

const fileInput = ref<HTMLInputElement | null>(null);
const isUploadingImage = ref(false);

const imgUrl = computed(() => {
  if (!props.modelValue) return undefined;
  if (props.modelValue.startsWith('ipfs://')) return getUrl(props.modelValue);
  return props.modelValue;
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

    emit('update:modelValue', image.url);
    isUploadingImage.value = false;
  } catch (e) {
    uiStore.addNotification('error', 'Failed to upload image.');

    console.error('Failed to upload image', e);
    isUploadingImage.value = false;
  }
}
</script>

<template>
  <div
    v-bind="$attrs"
    class="relative bg-skin-border h-[100px] -mb-[50px] overflow-hidden cursor-pointer group"
    @click="openFilePicker()"
  >
    <img
      v-if="imgUrl"
      :src="imgUrl"
      class="min-h-full object-cover group-hover:opacity-80"
      :class="{
        'opacity-80': isUploadingImage
      }"
    />
    <SpaceCover
      v-else-if="props.space?.cover"
      :space="props.space"
      class="pointer-events-none !rounded-none min-h-full object-cover group-hover:opacity-80"
    />

    <div
      class="pointer-events-none absolute group-hover:visible inset-0 z-10 flex flex-row w-full h-full items-center content-center justify-center"
    >
      <UiLoading v-if="isUploadingImage" class="block z-5" />
      <IH-pencil v-else class="invisible text-skin-link group-hover:visible" />
    </div>
  </div>
  <input
    ref="fileInput"
    type="file"
    accept="image/jpg, image/jpeg, image/png"
    class="hidden"
    @change="handleFileChange"
  />
</template>
