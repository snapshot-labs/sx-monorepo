<script setup lang="ts">
import { TUNE_OPTIONS_KEY } from '../../plugin';

const props = withDefaults(
  defineProps<{
    /**
     * The URL to preview.
     */
    url: string;
    /**
     * Whether to show a default link preview when actual preview is not available.
     */
    showDefault?: boolean;
  }>(),
  {
    showDefault: false
  }
);

type Preview = {
  title?: string;
  description?: string;
  icon?: string;
};

const options = inject(TUNE_OPTIONS_KEY, {});

const preview = ref<Preview | null>(null);
const previewIconResolved = ref<boolean>(false);
const previewLoading = ref<boolean>(true);

onMounted(() => update(props.url));

async function isImageUrlValid(url: string): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

async function update(val: string) {
  if (!options.linkPreviewUrl) return;

  try {
    preview.value = null;
    previewLoading.value = true;
    new URL(val);
    const result = await fetch(
      `${options.linkPreviewUrl}?url=${encodeURIComponent(val)}`
    );
    if (!result.ok) return;
    preview.value = await result.json();

    if (preview.value?.icon) {
      previewIconResolved.value = await isImageUrlValid(preview.value.icon);
    }
  } catch {
  } finally {
    previewLoading.value = false;
  }
}

debouncedWatch(
  () => props.url,
  val => update(val),
  { debounce: 500 }
);
</script>

<template>
  <div
    v-if="preview?.title || (showDefault && !previewLoading)"
    class="flex items-center px-4 py-3 border rounded-lg"
    :class="{
      'gap-2': showDefault,
      '!gap-4': preview?.title || previewIconResolved
    }"
  >
    <template v-if="preview && (preview.title || previewIconResolved)">
      <img
        v-if="previewIconResolved && preview.icon"
        :src="preview.icon"
        width="32"
        height="32"
        class="bg-white rounded shrink-0"
        :alt="preview.title"
      />
      <div class="flex flex-col truncate">
        <div
          class="text-skin-link truncate"
          v-text="preview.title || props.url"
        />
        <div
          v-if="preview.description"
          class="text-[17px] text-skin-text truncate"
          v-text="preview.description"
        />
      </div>
    </template>
    <template v-else-if="showDefault">
      <IH-link class="shrink-0" />
      <div class="truncate">{{ props.url }}</div>
    </template>
  </div>
</template>
