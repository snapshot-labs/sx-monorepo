<script setup>
import { debouncedWatch } from '@vueuse/core';

const props = defineProps({ url: String });
const preview = ref(false);
const IFRAMELY_API_KEY = 'd155718c86be7d5305ccb6';

onMounted(async () => await update(props.url));

async function update(val) {
  try {
    preview.value = false;
    new URL(val);
    const url = `https://cdn.iframe.ly/api/iframely?url=${encodeURI(
      val
    )}&api_key=${IFRAMELY_API_KEY}`;
    const result = await fetch(url);
    preview.value = await result.json();
  } catch (e) {
    // console.log(e);
  }
}

debouncedWatch(
  () => props.url,
  async val => await update(val),
  { debounce: 500 }
);
</script>

<template>
  <div v-if="preview?.meta?.title" class="!flex items-center border rounded-lg">
    <div v-if="preview?.links?.icon?.[0]?.href" class="px-4 pr-0">
      <div class="w-[32px]">
        <img :src="preview.links.icon[0].href" width="32" height="32" class="bg-white rounded" />
      </div>
    </div>
    <div class="px-4 py-3 overflow-hidden">
      <div class="text-skin-link truncate" v-text="preview.meta.title" />
      <div
        v-if="preview.meta.description"
        class="text-sm text-skin-text truncate"
        v-text="preview.meta.description"
      />
    </div>
  </div>
</template>
