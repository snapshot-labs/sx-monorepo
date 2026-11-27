<script setup lang="ts">
import { ListboxItem } from '@ui-sdk/vue/listbox';

defineProps<{
  value: string;
  isActive?: boolean;
  disabled?: boolean;
}>();
</script>

<template>
  <!-- An option of a UiSelectorGroup, still rendered as a button -->
  <ListboxItem :value="value" :disabled="disabled">
    <template #render="{ props }">
      <button
        v-bind="props"
        type="button"
        :disabled="disabled"
        class="border rounded-xl py-2.5 px-3 flex gap-3 text-left relative"
        :class="{ 'border-skin-content': isActive }"
      >
        <slot />
        <div class="w-[20px] text-right text-skin-link absolute right-3 top-3">
          <IH-check v-if="isActive" />
        </div>
      </button>
    </template>
  </ListboxItem>
</template>
