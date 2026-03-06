<script setup lang="ts" generic="T extends string | number">
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Popover,
  PopoverButton,
  PopoverPanel
} from '@headlessui/vue';

const model = defineModel<T[]>({ required: true });

const props = defineProps<{
  items: { id: T; name: string; [key: string]: unknown }[];
  searchKeys?: string[];
  buttonProps?: Record<string, any>;
  panelProps?: Record<string, any>;
}>();

defineSlots<{
  button(props: { close: () => void }): any;
  item(props: {
    item: { id: T; name: string; [key: string]: unknown };
    isActive: boolean;
    isSelected: boolean;
  }): any;
}>();

const searchValue = ref('');

const filteredItems = computed(() =>
  props.items.filter(item => {
    const search = searchValue.value.toLowerCase();
    const keys = props.searchKeys ?? ['name'];
    return keys.some(key =>
      String(item[key] ?? '')
        .toLowerCase()
        .includes(search)
    );
  })
);
</script>

<template>
  <Popover v-slot="{ open, close }" class="relative contents">
    <PopoverButton
      class="w-full"
      :class="open ? 'text-skin-link' : 'text-skin-text'"
      v-bind="buttonProps"
    >
      <slot name="button" :close="close">
        <IH-pencil />
      </slot>
    </PopoverButton>
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-1 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-1 opacity-0"
    >
      <PopoverPanel
        focus
        class="absolute z-30 left-0 -mt-2 mx-4 pb-3"
        style="width: calc(100% - 48px)"
        v-bind="panelProps"
      >
        <Combobox v-slot="{ activeOption }" v-model="model" multiple nullable>
          <div class="bg-skin-bg rounded-xl overflow-hidden shadow-bottom">
            <div
              class="flex items-center px-3 py-[14px] bg-skin-border border-b border-skin-heading border-opacity-5"
            >
              <IH-search class="mr-2" />
              <ComboboxInput
                class="flex-auto bg-transparent text-skin-link"
                as="input"
                placeholder="Search"
                :value="searchValue"
                @change="
                  (e: Event) =>
                    (searchValue = (e.target as HTMLInputElement).value)
                "
              />
            </div>
            <div class="max-h-[345px] overflow-auto no-scrollbar">
              <ComboboxOptions static hold>
                <ComboboxOption
                  v-for="item in filteredItems"
                  :key="item.id"
                  :value="item.id"
                  class="flex justify-between items-center bg-skin-border px-3 py-[11.5px] cursor-pointer w-full"
                  :class="activeOption === item.id ? 'bg-opacity-70' : ''"
                  as="template"
                >
                  <li class="flex justify-between items-center w-full">
                    <slot
                      name="item"
                      :item="item"
                      :is-active="activeOption === item.id"
                      :is-selected="model.includes(item.id)"
                    >
                      <span class="w-11/12 truncate">
                        {{ item.name }}
                      </span>
                    </slot>
                    <div v-if="model.includes(item.id)">
                      <IH-check class="text-skin-success" />
                    </div>
                  </li>
                </ComboboxOption>
              </ComboboxOptions>
            </div>
          </div>
        </Combobox>
      </PopoverPanel>
    </transition>
  </Popover>
</template>

<style lang="scss" scoped>
.shadow-bottom {
  box-shadow: 0px 10px 15px -3px rgba(0, 0, 0, 0.1);
}
</style>
