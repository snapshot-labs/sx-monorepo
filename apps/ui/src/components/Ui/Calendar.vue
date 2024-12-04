<script setup lang="ts">
import dayjs from 'dayjs';

const props = defineProps<{
  min?: number;
  selected?: number;
}>();

const emit = defineEmits<{
  (e: 'pick', timestamp: number): void;
}>();

const today = dayjs(Date.now()).startOf('day');

const selected = ref<dayjs.Dayjs | null>(
  props.selected ? dayjs.unix(props.selected).startOf('day') : null
);
const currentView = ref<dayjs.Dayjs>(
  dayjs.unix(props.selected || Math.floor(Date.now() / 1000)).startOf('month')
);

const contents = computed(() => {
  const start = currentView.value.startOf('week');
  const end = currentView.value.endOf('month').endOf('week');
  const days: dayjs.Dayjs[] = [];
  let pivot = start;

  do {
    days.push(pivot);
    pivot = pivot.add(1, 'day');
  } while (pivot.isBefore(end));

  return days;
});

function handleDateClick(date: dayjs.Dayjs) {
  if (!isSelectable(date)) return;

  selected.value = date;
  emit('pick', date.unix());
}

function isSelectable(date: dayjs.Dayjs) {
  if (!date.isSame(currentView.value, 'month')) return false;
  if (!props.min) return true;

  return date.valueOf() >= dayjs.unix(props.min).startOf('day').valueOf();
}
</script>

<template>
  <div class="calendar space-y-2 mx-auto">
    <div class="flex items-center">
      <div class="w-1/4 flex items-center justify-start">
        <button @click="currentView = currentView.subtract(1, 'month')">
          <IH-chevron-left />
        </button>
      </div>
      <h4
        class="h-full w-full text-center"
        v-text="dayjs(currentView).format('MMMM YYYY')"
      />
      <div class="w-1/4 flex items-center justify-end">
        <button @click="currentView = currentView.add(1, 'month')">
          <IH-chevron-right />
        </button>
      </div>
    </div>
    <div class="grid-cols-7">
      <div
        v-for="(header, i) in contents.slice(0, 7)"
        :key="i"
        class="cell text-skin-link"
        v-text="header.format('ddd')"
      />
      <button
        v-for="(date, i) in contents"
        :key="i"
        :disabled="!isSelectable(date)"
        class="cell day unselectable"
        :class="{
          '!cursor-default': !date.isSame(currentView, 'month'),
          today: date.isSame(today),
          selected: selected && selected.isSame(date),
          selectable: isSelectable(date)
        }"
        @click="handleDateClick(date)"
        v-text="
          date.isSame(currentView, 'month') ? date.format('DD') : '&nbsp;'
        "
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.calendar {
  $size: 44px;
  width: $size * 7;

  .cell {
    @apply inline-block text-center size-[#{$size}] leading-[#{$size}];
  }

  .day {
    @apply text-skin-border rounded-full cursor-default;

    &.unselectable {
      @apply cursor-not-allowed;
    }

    &.selectable {
      @apply text-skin-link hover:bg-skin-link hover:text-skin-bg cursor-pointer;
    }

    &.selected {
      @apply bg-skin-link;
      @apply text-skin-bg;
    }

    &.today {
      @apply border border-skin-border;
    }
  }
}
</style>
