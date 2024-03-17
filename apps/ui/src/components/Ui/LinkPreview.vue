<script setup lang="ts">
const props = withDefaults(defineProps<{ url: string; showDefault?: boolean }>(), {
  showDefault: false
});

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
    class="!flex items-center border rounded-lg"
  >
    <template v-if="preview?.meta?.title">
      <div v-if="preview?.links?.icon?.[0]?.href" class="px-4 pr-0">
        <div class="w-[32px]">
          <img
            :src="preview.links.icon[0].href"
            width="32"
            height="32"
            class="bg-white rounded"
            :alt="preview.meta.title"
          />
        </div>
      </div>
      <div class="px-4 py-3 overflow-hidden">
        <div class="text-skin-link truncate" v-text="preview.meta.title" />
        <div
          v-if="preview.meta.description"
          class="text-[17px] text-skin-text truncate"
          v-text="preview.meta.description"
        />
      </div>
    </template>
    <div v-else-if="showDefault" class="px-4 py-3 flex gap-2 items-center w-full">
      <IH-link class="shrink-0" />
      <div class="truncate">{{ props.url }}</div>
    </div>
  </div>
</template>
