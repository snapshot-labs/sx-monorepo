<script setup lang="ts">
import { shortenAddress } from '@/helpers/utils';

withDefaults(
  defineProps<{
    address: string;
    copyButton?: 'always' | 'hover';
  }>(),
  { copyButton: 'hover' }
);

const { copy, copied } = useClipboard();
</script>

<template>
  <span class="flex items-center gap-1.5 group">
    {{ shortenAddress(address) }}
    <UiTooltip
      title="Copy address"
      :class="{
        'hidden group-hover:block group-focus-within:block':
          copyButton === 'hover'
      }"
    >
      <button
        type="button"
        class="text-skin-text h-[18px]"
        @click.prevent.stop="copy(address)"
      >
        <IH-duplicate
          v-if="!copied"
          class="w-[18px] h-[18px] relative top-[-1px] inline-block"
        />
        <IH-check
          v-else
          class="w-[18px] h-[18px] relative top-[-1px] inline-block"
        />
      </button>
    </UiTooltip>
  </span>
</template>
