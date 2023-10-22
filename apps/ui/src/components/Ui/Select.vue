<script setup lang="ts" generic="T extends string | number, U extends readonly Item<T>[]">
export type Item<T extends string | number> = {
  key: T;
  label: string;
  indicator?: string;
};

const props = defineProps<{
  modelValue: U[number]['key'];
  title: string;
  items: U;
  gap?: string;
  placement?: 'left' | 'right';
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: U[number]['key']): void;
}>();

const currentItem = computed(() => props.items.find(item => item.key === props.modelValue));
const items = computed(() => props.items);
</script>

<template>
  <UiDropdown :gap="gap" :placement="placement">
    <template #button>
      <slot name="button">
        <button
          class="flex items-center gap-2 relative rounded-full leading-[100%] border button px-[16px] min-w-[76px] h-[42px] top-1 outline-0 text-skin-link bg-skin-bg"
        >
          <div class="absolute top-[-10px] bg-skin-bg px-1 left-[12px] text-[16px] text-skin-text">
            {{ title }}
          </div>
          <template v-if="currentItem">
            <div
              v-if="currentItem.indicator"
              class="w-[8px] h-[8px] rounded-full"
              :class="currentItem.indicator"
            />
            {{ currentItem.label }}
          </template>
        </button>
      </slot>
    </template>
    <template #items>
      <UiDropdownItem v-for="item in items" :key="item.key" v-slot="{ active, disabled }">
        <button
          class="flex items-center gap-2"
          :class="{ 'opacity-80': active, 'opacity-40': disabled }"
          @click="() => emit('update:modelValue', item.key)"
        >
          <div v-if="item.indicator" class="w-[8px] h-[8px] rounded-full" :class="item.indicator" />
          {{ item.label }}
        </button>
      </UiDropdownItem>
    </template>
  </UiDropdown>
</template>
