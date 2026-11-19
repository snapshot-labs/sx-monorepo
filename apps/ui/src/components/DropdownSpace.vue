<script lang="ts" setup>
import { Space } from '@/types';

// The rows that move between the two levels look like menu items, but are not: the menu stays open.
const LEVEL_ROW_CLASS =
  'w-full px-3 py-1.5 leading-6 text-[17px] whitespace-nowrap flex items-center gap-2 hover:bg-skin-link/[.08]';

defineProps<{ space: Space }>();

const uiStore = useUiStore();
const { copy } = useClipboard();

const isCalendarLevel = ref(false);

function handleCopyLinkClick() {
  copy(window.location.href);
  uiStore.addNotification('success', 'Link copied.');
}
</script>

<template>
  <UiDropdown>
    <template #button>
      <UiButton title="More" uniform @click="isCalendarLevel = false">
        <IH-dots-horizontal />
      </UiButton>
    </template>
    <template #items>
      <template v-if="isCalendarLevel">
        <button
          type="button"
          :class="LEVEL_ROW_CLASS"
          @click="isCalendarLevel = false"
        >
          <IH-chevron-left />
          Add to calendar
        </button>
        <DropdownCalendarItems :space="space" />
      </template>
      <template v-else>
        <button
          type="button"
          :class="LEVEL_ROW_CLASS"
          @click="isCalendarLevel = true"
        >
          <IH-calendar />
          Add to calendar
          <IH-chevron-right class="ml-auto" />
        </button>
        <UiDropdownItem @click="handleCopyLinkClick">
          <IH-link />
          Copy link to space
        </UiDropdownItem>
      </template>
    </template>
  </UiDropdown>
</template>
