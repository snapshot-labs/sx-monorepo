<script setup lang="ts">
import { getUrl, imageUpload } from '@/helpers/utils';

const props = defineProps<{
  modelValue?: string;
  error?: string;
  definition: any;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string);
}>();

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
  } catch (error) {
    console.error(error);
    isUploadingImage.value = false;
  }
}
</script>

<template>
  <div
    v-bind="$attrs"
    class="relative h-[80px] group max-w-max cursor-pointer mb-3"
    @click="openFilePicker()"
  >
    <img
      v-if="imgUrl"
      :src="imgUrl"
      class="w-full min-w-[80px] h-full !rounded-lg group-hover:opacity-80"
      :class="{
        'opacity-80': isUploadingImage
      }"
    />
    <Stamp
      v-else
      :id="definition.default"
      :size="80"
      class="pointer-events-none border-[4px] border-skin-bg !bg-skin-bg !rounded-lg group-hover:opacity-80"
      type="space"
      :class="{
        'opacity-80': isUploadingImage
      }"
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
