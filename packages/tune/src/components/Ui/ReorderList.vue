<script setup lang="ts" generic="T">
import { createParts } from '@ui-sdk/vue/primitive';
import { reorderList } from '../../helpers/reorderList';
import SlotRoot from '../../helpers/SlotRoot';

const { Root, Item } = createParts(reorderList, { root: 'div', item: 'div' });

const model = defineModel<T[]>({ required: true });

const props = defineProps<{
  /** An object key stands for that object, like Vue's `key` */
  itemKey: (item: T, index: number) => string | number | object;
  /** A selector for the part of an item that drags it, else the whole item */
  handle?: string;
  /** How long a touch holds still before it drags, so a swipe still scrolls */
  touchDelay?: number;
  /** Slide the other items aside while one moves */
  animated?: boolean;
}>();

defineSlots<{
  item(props: { element: T; index: number }): any;
}>();

const objectKeys = new WeakMap<object, string>();
let objectCount = 0;

const keys = computed(() =>
  model.value.map((item, index) => {
    const key = props.itemKey(item, index);
    if (typeof key !== 'object') return String(key);
    if (!objectKeys.has(key)) objectKeys.set(key, `#${objectCount++}`);
    return objectKeys.get(key)!;
  })
);

function itemOf(key: string) {
  return model.value[keys.value.indexOf(key)] as T;
}

function reorder(order: string[]) {
  model.value = order.map(itemOf);
}
</script>

<template>
  <Root
    v-slot="{ state }"
    :value="keys"
    :handle="handle"
    :touch-delay="touchDelay"
    @value-change="reorder"
  >
    <TransitionGroup
      :move-class="animated ? 'transition-transform duration-200' : ''"
    >
      <!-- Each item is the slot's own root, with no wrapper -->
      <Item v-for="key in state.order" :key="key" :value="key">
        <template #render="{ props: itemProps }">
          <SlotRoot v-bind="itemProps">
            <slot
              name="item"
              :element="itemOf(key)"
              :index="keys.indexOf(key)"
            />
          </SlotRoot>
        </template>
      </Item>
    </TransitionGroup>
  </Root>
</template>
