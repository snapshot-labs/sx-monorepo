<script setup lang="ts">
const props = defineProps<{
  searchValue: string;
  loading: boolean;
  nfts: any[];
}>();

const emit = defineEmits<{
  (e: 'pick', value: string);
}>();

const filteredNfts = computed(() =>
  props.nfts.filter(nft => {
    return nft.displayTitle.toLocaleLowerCase().includes(props.searchValue.toLocaleLowerCase());
  })
);
</script>

<template>
  <div v-if="loading" class="px-4 py-3 block flex justify-center">
    <UiLoading />
  </div>
  <template v-else>
    <div v-if="filteredNfts.length === 0" class="text-center py-3" v-text="'No results'" />
    <div v-else class="grid gap-3 grid-cols-3 p-3">
      <a
        v-for="(nft, i) in filteredNfts"
        :key="i"
        role="button"
        class="block hover:opacity-80 transition-opacity"
        @click="emit('pick', nft.id)"
      >
        <NftPreview :item="nft" class="w-full" />
        <div class="mt-2 text-sm truncate">{{ nft.displayTitle }}</div>
      </a>
    </div>
  </template>
</template>
