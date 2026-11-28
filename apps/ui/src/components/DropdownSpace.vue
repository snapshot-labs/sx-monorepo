<script lang="ts" setup>
import { Space } from '@/types';

defineProps<{ space: Space }>();

const uiStore = useUiStore();
const { copy } = useClipboard();

const buttonRef = ref<{ $el: HTMLElement } | null>(null);
const isCalendarLevel = ref(false);

// A menu item closes the menu: to move to the other level, the menu is opened again on it.
async function showLevel(isCalendar: boolean) {
  await nextTick();
  buttonRef.value?.$el.click();
  isCalendarLevel.value = isCalendar;
}

function handleCopyLinkClick() {
  copy(window.location.href);
  uiStore.addNotification('success', 'Link copied.');
}
</script>

<template>
  <UiDropdown>
    <template #button>
      <UiButton
        ref="buttonRef"
        title="More"
        aria-label="More"
        uniform
        @click="isCalendarLevel = false"
      >
        <IH-dots-horizontal />
      </UiButton>
    </template>
    <template #items>
      <template v-if="isCalendarLevel">
        <UiDropdownItem @click="showLevel(false)">
          <IH-chevron-left />
          Add to calendar
        </UiDropdownItem>
        <DropdownCalendarItems :space="space" />
      </template>
      <template v-else>
        <UiDropdownItem @click="showLevel(true)">
          <IH-calendar />
          Add to calendar
          <IH-chevron-right class="ml-auto" />
        </UiDropdownItem>
        <UiDropdownItem @click="handleCopyLinkClick">
          <IH-link />
          Copy link to space
        </UiDropdownItem>
      </template>
    </template>
  </UiDropdown>
</template>
