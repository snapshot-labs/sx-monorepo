<script lang="ts" setup>
import { FunctionalComponent } from 'vue';
import { SIDEKICK_URL } from '@/helpers/constants';
import { Space } from '@/types';
import ICApple from '~icons/c/apple';
import ICGoogleCalendar from '~icons/c/google-calendar';
import ICOutlook from '~icons/c/outlook';

const props = defineProps<{ space: Space }>();

const uiStore = useUiStore();
const { copy } = useClipboard();

// The calendar of the space's proposals, an iCalendar feed served by Sidekick.
const url = computed(
  () => `${SIDEKICK_URL}/${props.space.network}:${props.space.id}/calendar.ics`
);
const webcalUrl = computed(() => url.value.replace(/^https/, 'webcal'));

const apps = computed<
  { name: string; icon: FunctionalComponent; link: string }[]
>(() => [
  {
    name: 'Google Calendar',
    icon: ICGoogleCalendar,
    link: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl.value)}`
  },
  { name: 'Apple Calendar', icon: ICApple, link: webcalUrl.value },
  {
    name: 'Outlook',
    icon: ICOutlook,
    link: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(url.value)}&name=${encodeURIComponent(`${props.space.name} proposals`)}`
  }
]);

function handleCopyLinkClick() {
  copy(url.value);
  uiStore.addNotification('success', 'Calendar link copied.');
}
</script>

<template>
  <UiDropdown placement="start">
    <template #button>
      <button
        type="button"
        title="Add to calendar"
        class="block text-skin-text hover:text-skin-link"
      >
        <IH-calendar class="size-[26px]" />
      </button>
    </template>
    <template #items>
      <UiDropdownItem
        v-for="app in apps"
        :key="app.name"
        :title="`Add to ${app.name}`"
        :to="app.link"
        is-external
      >
        <component :is="app.icon" />
        Add to {{ app.name }}
      </UiDropdownItem>
      <UiDropdownItem @click="handleCopyLinkClick">
        <IH-link />
        Copy calendar link
      </UiDropdownItem>
    </template>
  </UiDropdown>
</template>
