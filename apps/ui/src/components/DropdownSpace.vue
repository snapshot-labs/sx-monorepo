<script lang="ts" setup>
import { SIDEKICK_URL } from '@/helpers/constants';
import { Space } from '@/types';
import ICApple from '~icons/c/apple';
import ICGoogleCalendar from '~icons/c/google-calendar';
import ICOutlook from '~icons/c/outlook';

// The rows that move between the two levels look like menu items, but are not: the menu stays open.
const LEVEL_ROW_CLASS =
  'w-full px-3 py-1.5 leading-6 text-[17px] whitespace-nowrap flex items-center gap-2 hover:bg-skin-link/[.08]';

const props = defineProps<{ space: Space }>();

const uiStore = useUiStore();
const { copy } = useClipboard();

const isCalendarLevel = ref(false);

// The calendar of the space's proposals, an iCalendar feed served by Sidekick.
const calendarUrl = computed(
  () => `${SIDEKICK_URL}/${props.space.network}:${props.space.id}/calendar.ics`
);

const calendarApps = computed(() => {
  const webcalUrl = calendarUrl.value.replace(/^https/, 'webcal');

  return [
    {
      name: 'Google Calendar',
      icon: ICGoogleCalendar,
      link: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`
    },
    { name: 'Apple Calendar', icon: ICApple, link: webcalUrl },
    {
      name: 'Outlook',
      icon: ICOutlook,
      link: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(calendarUrl.value)}&name=${encodeURIComponent(`${props.space.name} proposals`)}`
    }
  ];
});

function copyLink(link = window.location.href) {
  copy(link);
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
        <UiDropdownItem
          v-for="app in calendarApps"
          :key="app.name"
          :to="app.link"
          is-external
        >
          <component :is="app.icon" />
          {{ app.name }}
        </UiDropdownItem>
        <UiDropdownItem @click="copyLink(calendarUrl)">
          <IH-link />
          Copy link
        </UiDropdownItem>
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
        <UiDropdownItem @click="copyLink()">
          <IH-link />
          Copy link to space
        </UiDropdownItem>
      </template>
    </template>
  </UiDropdown>
</template>
