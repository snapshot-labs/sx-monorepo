<script setup>
import { computed } from 'vue';

const props = defineProps({
  searchValue: String,
  loading: Boolean,
  nfts: Array
});

const emit = defineEmits(['pick']);

const filteredNfts = computed(() =>
  props.nfts.filter(nft => {
    return nft.displayTitle
      .toLocaleLowerCase()
      .includes(props.searchValue.toLocaleLowerCase());
  })
);
</script>

<template>
  <div v-if="loading" class="px-4 py-3 block flex justify-center">
    <UiLoading />
  </div>
  <template v-else>
    <div v-if="filteredNfts.length === 0" class="text-center py-2">
      No results
    </div>
    <div v-else class="grid gap-2 grid-cols-3 py-3 px-2">
      <a
        v-for="(nft, i) in filteredNfts"
        :key="i"
        role="button"
        class="block px-3 py-1 mb-3 hover:opacity-80 transition-opacity"
        @click="emit('pick', nft.id)"
      >
        <NftPreview :item="nft" class="aspect-square rounded" />
        <div class="mt-2 text-sm">{{ nft.displayTitle }}</div>
      </a>
    </div>
  </template>
</template>
