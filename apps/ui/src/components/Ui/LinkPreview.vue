<script setup lang="ts">
const props = withDefaults(
  defineProps<{ url: string; showDefault?: boolean }>(),
  {
    showDefault: false
  }
);

type Preview = {
  meta: {
    title: string;
    description: string;
  };
  links: {
    icon: { href: string }[];
  };
};

const preview = ref<Preview | null>(null);
const previewIconResolved = ref<boolean>(false);
const previewLoading = ref<boolean>(true);
const IFRAMELY_API_KEY = 'd155718c86be7d5305ccb6';

onMounted(async () => await update(props.url));

async function update(val: string) {
  try {
    preview.value = null;
    previewLoading.value = true;
    new URL(val);
    const url = `https://cdn.iframe.ly/api/iframely?url=${encodeURI(
      val
    )}&api_key=${IFRAMELY_API_KEY}`;
    const result = await fetch(url);
    preview.value = await result.json();

    if (preview.value?.links?.icon[0]?.href) {
      const image = await fetch(preview.value.links.icon[0].href, {
        method: 'HEAD'
      });

      previewIconResolved.value = image.ok;
    }
  } catch (e) {
  } finally {
    previewLoading.value = false;
  }
}

debouncedWatch(
  () => props.url,
  async val => await update(val),
  { debounce: 500 }
);
</script>

<template>
  <div
    v-if="preview?.meta || (showDefault && !previewLoading)"
    class="flex items-center px-4 py-3 border rounded-lg"
    :class="{
      'gap-2': showDefault,
      '!gap-4': preview?.meta?.title || previewIconResolved
    }"
  >
    <template v-if="preview && (preview?.meta?.title || previewIconResolved)">
      <img
        v-if="previewIconResolved"
        :src="preview.links.icon[0].href"
        width="32"
        height="32"
        class="bg-white rounded shrink-0"
        :alt="preview.meta.title"
      />
      <div class="flex flex-col truncate">
        <div
          class="text-skin-link truncate"
          v-text="preview.meta.title || props.url"
        />
        <div
          v-if="preview.meta.description"
          class="text-[17px] text-skin-text truncate"
          v-text="preview.meta.description"
        />
      </div>
    </template>
    <template v-else-if="showDefault">
      <IH-link class="shrink-0" />
      <div class="truncate">{{ props.url }}</div>
    </template>
  </div>
</template>
