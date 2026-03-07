<script
  setup
  lang="ts"
  generic="T extends string | number, U extends readonly Item<T>[]"
>
import { CSSProperties } from 'vue';

export type Item<T extends string | number> = {
  key: T;
  label: string;
  indicator?: string;
  indicatorStyle?: CSSProperties;
  component?: Component;
  componentProps?: Record<string, unknown>;
};

const model = defineModel<U[number]['key']>({ required: true });

const props = defineProps<{
  title: string;
  items: U;
  gap?: string;
  placement?: 'start' | 'end';
}>();

const currentItem = computed(() =>
  props.items.find(item => item.key === model.value)
);
const items = computed(() => props.items);
</script>

<template>
  <UiDropdown :gap="gap" :placement="placement">
    <template #button>
      <slot name="button">
        <button
          type="button"
          class="flex items-center gap-2 relative rounded-full leading-[100%] border button px-3 min-w-[76px] h-[42px] top-1 text-skin-link bg-skin-bg"
        >
          <div
            class="absolute top-[-10px] bg-skin-bg px-1 left-2.5 text-sm text-skin-text"
          >
            {{ title }}
          </div>
          <template v-if="currentItem">
            <div
              v-if="currentItem.indicator || currentItem.indicatorStyle"
              class="size-[8px] rounded-full"
              :class="currentItem.indicator"
              :style="currentItem.indicatorStyle"
            />
            <component
              :is="currentItem.component"
              v-else-if="currentItem.component"
              v-bind="currentItem.componentProps"
            />
            {{ currentItem.label }}
          </template>
        </button>
      </slot>
    </template>
    <template #items>
      <UiDropdownItem
        v-for="item in items"
        :key="item.key"
        @click="model = item.key"
      >
        <div
          v-if="item.indicator || item.indicatorStyle"
          class="size-[8px] rounded-full"
          :class="item.indicator"
          :style="item.indicatorStyle"
        />
        <component
          :is="item.component"
          v-else-if="item.component"
          v-bind="item.componentProps"
        />
        {{ item.label }}
      </UiDropdownItem>
    </template>
  </UiDropdown>
</template>
