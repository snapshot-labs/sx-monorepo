<script lang="ts" setup>
import {
  CalendarSpace,
  getCalendarApps,
  getCalendarUrl
} from '@/helpers/calendar';

const props = defineProps<{ space: CalendarSpace }>();

const uiStore = useUiStore();
const { copy } = useClipboard();

const calendarApps = computed(() => getCalendarApps(props.space));

function handleCopyLinkClick() {
  copy(getCalendarUrl(props.space));
  uiStore.addNotification('success', 'Link copied.');
}
</script>

<template>
  <UiDropdownItem
    v-for="app in calendarApps"
    :key="app.name"
    :to="app.link"
    is-external
  >
    <component :is="app.icon" />
    {{ app.name }}
  </UiDropdownItem>
  <UiDropdownItem @click="handleCopyLinkClick">
    <IH-link />
    Copy link
  </UiDropdownItem>
</template>
