<script setup lang="ts">
import { Nft } from '@/composables/useNfts';

const props = defineProps<{
  searchValue: string;
  loading: boolean;
  nfts: Nft[];
}>();

const emit = defineEmits<{
  (e: 'pick', value: string);
}>();

const filteredNfts = computed(() =>
  props.nfts.filter(nft => {
    return nft.displayTitle
      .toLocaleLowerCase()
      .includes(props.searchValue.toLocaleLowerCase());
  })
);
</script>

<template>
  <div v-if="loading" class="px-4 py-3 flex justify-center">
    <UiLoading />
  </div>
  <template v-else>
    <div
      v-if="filteredNfts.length === 0"
      class="text-center py-3"
      v-text="'No results'"
    />
    <div v-else class="grid gap-3 grid-cols-3 p-3">
      <button
        v-for="(nft, i) in filteredNfts"
        :key="i"
        type="button"
        class="block hover:opacity-80 transition-opacity"
        @click="emit('pick', nft.id)"
      >
        <UiNftImage :item="nft" class="w-full" />
        <div class="mt-2 text-[17px] truncate">{{ nft.displayTitle }}</div>
      </button>
    </div>
  </template>
</template>
