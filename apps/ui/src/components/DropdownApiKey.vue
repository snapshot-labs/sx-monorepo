<script setup lang="ts">
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Popover,
  PopoverButton,
  PopoverPanel
} from '@headlessui/vue';
import { Float } from '@headlessui-float/vue';
import { ApiKey } from '@/helpers/keycard/types';

const model = defineModel<string>({ required: true });

const props = defineProps<{
  keys: ApiKey[];
}>();

const panel = ref<InstanceType<typeof PopoverPanel> | null>(null);
const searchValue = ref('');

const items = computed(() => [
  { key: 'all', label: 'All keys' },
  ...props.keys
    .map(key => ({ key: key.key, label: key.name }))
    .sort((a, b) => a.label.localeCompare(b.label))
]);

const filteredItems = computed(() => {
  const search = searchValue.value.toLowerCase();

  return items.value.filter(item => item.label.toLowerCase().includes(search));
});

const currentLabel = computed(
  () => items.value.find(item => item.key === model.value)?.label
);

function handleSelect(key: string, close: () => void) {
  model.value = key;
  close();
}

watch(panel, isOpen => {
  if (isOpen) searchValue.value = '';
});
</script>

<template>
  <Popover v-slot="{ close }" as="div" class="relative min-w-[76px]">
    <Float
      placement="bottom-end"
      :offset="8"
      strategy="fixed"
      :shift="{ padding: 0 }"
      flip
      portal
      z-index="60"
    >
      <PopoverButton
        class="flex items-center relative w-full rounded-full leading-[100%] border button px-3 h-[42px] top-1 text-skin-link bg-skin-bg"
      >
        <div
          class="absolute top-[-10px] bg-skin-bg px-1 left-2.5 text-sm text-skin-text"
        >
          API key
        </div>
        <span class="truncate max-w-[180px]">{{ currentLabel }}</span>
      </PopoverButton>
      <transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="transform scale-95 opacity-0"
        enter-to-class="transform scale-100 opacity-100"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="transform scale-100 opacity-100"
        leave-to-class="transform scale-95 opacity-0"
      >
        <PopoverPanel
          ref="panel"
          focus
          class="w-[260px] rounded-md bg-skin-border text-skin-link shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden"
        >
          <Combobox
            :model-value="model"
            @update:model-value="key => handleSelect(key, close)"
          >
            <div class="flex items-center gap-2 px-3 py-2 border-b">
              <IH-search class="shrink-0 text-skin-text" />
              <ComboboxInput
                class="flex-auto min-w-0 bg-transparent text-skin-link outline-none"
                placeholder="Search"
                :value="searchValue"
                @change="searchValue = $event.target.value"
                @keydown.escape="close()"
              />
            </div>
            <ComboboxOptions
              static
              hold
              class="max-h-[208px] overflow-y-auto py-1"
            >
              <div
                v-if="filteredItems.length === 0"
                class="px-3 py-1.5 leading-6 text-skin-text"
              >
                No results
              </div>
              <ComboboxOption
                v-for="item in filteredItems"
                v-slot="{ active, selected }"
                :key="item.key"
                :value="item.key"
                as="template"
              >
                <li
                  class="flex items-center justify-between gap-2 px-3 py-1.5 leading-6 text-[17px] cursor-pointer"
                  :class="{ 'bg-skin-link/[.08]': active }"
                >
                  <span class="truncate">{{ item.label }}</span>
                  <IH-check
                    v-if="selected"
                    class="shrink-0 text-skin-success"
                  />
                </li>
              </ComboboxOption>
            </ComboboxOptions>
          </Combobox>
        </PopoverPanel>
      </transition>
    </Float>
  </Popover>
</template>
