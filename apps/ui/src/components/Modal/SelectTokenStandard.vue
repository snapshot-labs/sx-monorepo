<script lang="ts" setup>
export type TokenStandard = 'ERC20' | 'ERC721' | 'ERC1155';

const ITEMS: Record<TokenStandard, { label: string; description: string }> = {
  ERC20: {
    label: 'ERC-20',
    description: 'For tokens e.g. ETH, USDC, UNI, etc...'
  },
  ERC721: {
    label: 'ERC-721',
    description: 'For non-fungible tokens e.g. CryptoKitties, Doodle, etc...'
  },
  ERC1155: {
    label: 'ERC-1155',
    description:
      'For both fungibles and non-fungibles tokens, e.g. MANA, Decentraland, etc...'
  }
} as const;

defineProps<{
  open: boolean;
  initialState?: string;
}>();

const emit = defineEmits<{
  (e: 'close');
  (e: 'save', value: TokenStandard);
}>();
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3>Select token standard</h3>
    </template>
    <div class="p-4 flex flex-col gap-2.5">
      <UiSelector
        v-for="(standard, id) in ITEMS"
        :key="id"
        :is-active="initialState === id"
        class="w-full"
        @click="emit('save', id)"
      >
        <div>
          <h4 class="text-skin-link" v-text="standard.label" />
          <div v-text="standard.description" />
        </div>
      </UiSelector>
    </div>
  </UiModal>
</template>
