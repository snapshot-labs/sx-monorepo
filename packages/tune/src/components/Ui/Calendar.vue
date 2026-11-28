<script setup lang="ts">
import {
  Calendar,
  CalendarDay,
  CalendarGrid,
  CalendarHeading,
  CalendarNext,
  CalendarPrevious,
  CalendarWeekday,
  CalendarWeekdays,
  CalendarWeeks
} from '@ui-sdk/vue/calendar';
import dayjs from 'dayjs';

const props = defineProps<{
  min?: number;
  selected?: number;
}>();

const emit = defineEmits<{
  (e: 'pick', timestamp: number): void;
}>();

// UI SDK works with ISO dates, the app with timestamps
const toISODate = (timestamp?: number) =>
  timestamp ? dayjs.unix(timestamp).format('YYYY-MM-DD') : undefined;

function pick(value: unknown) {
  if (typeof value === 'string') emit('pick', dayjs(value).unix());
}
</script>

<template>
  <!-- Weeks start on Sunday and days of other months stay blank, like before -->
  <Calendar
    :value="toISODate(props.selected) ?? null"
    :min="toISODate(props.min)"
    :week-starts-on="0"
    weekday-format="short"
    :show-outside-days="false"
    class="calendar space-y-2 mx-auto"
    @value-change="pick"
  >
    <div class="flex items-center">
      <div class="w-1/4 flex items-center justify-start">
        <CalendarPrevious>
          <IH-chevron-left />
        </CalendarPrevious>
      </div>
      <CalendarHeading>
        <template #render="{ props: headingProps, children }">
          <h4 v-bind="headingProps" class="h-full w-full text-center">
            <component :is="children" />
          </h4>
        </template>
      </CalendarHeading>
      <div class="w-1/4 flex items-center justify-end">
        <CalendarNext>
          <IH-chevron-right />
        </CalendarNext>
      </div>
    </div>
    <CalendarGrid class="border-separate border-spacing-0">
      <CalendarWeekdays v-slot="{ index }">
        <CalendarWeekday
          :index="index"
          class="weekday font-normal text-skin-link"
        />
      </CalendarWeekdays>
      <CalendarWeeks v-slot="{ cell }">
        <CalendarDay :value="cell.date" class="p-0">
          <template #render="{ props: dayProps, state }">
            <td v-bind="dayProps" class="p-0 align-baseline outline-none">
              <span
                class="cell day"
                :class="{
                  today: state.today,
                  selected: state.selected,
                  selectable: !state.disabled,
                  unselectable: state.disabled
                }"
                v-text="dayjs(state.date).format('DD')"
              />
            </td>
          </template>
        </CalendarDay>
      </CalendarWeeks>
    </CalendarGrid>
  </Calendar>
</template>

<style scoped lang="scss">
.calendar {
  $size: 44px;
  width: $size * 7;

  .weekday {
    @apply p-0 text-center size-[#{$size}] leading-[#{$size}];
  }

  .cell {
    @apply inline-block p-0 text-center size-[#{$size}] leading-[#{$size}];

    &.day {
      @apply text-skin-border rounded-full cursor-default;

      &.unselectable {
        @apply cursor-not-allowed;
      }

      &.selectable {
        @apply text-skin-link hover:bg-skin-primary hover:text-skin-accent-foreground cursor-pointer;
      }

      &.selected {
        @apply bg-skin-primary;
        @apply text-skin-bg;
      }

      &.today {
        @apply border border-skin-border;
      }
    }
  }
}
</style>
