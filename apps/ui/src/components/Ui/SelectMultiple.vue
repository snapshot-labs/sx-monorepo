<script setup lang="ts" generic="T extends string | number, U extends Item<T>">
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions
} from '@headlessui/vue';

export type Item<T extends string | number> = {
  id: T;
  name: string;
};

defineOptions({ inheritAttrs: false });

const model = defineModel<T[]>({ required: true });

const props = defineProps<{
  error?: string;
  definition: {
    options: U[];
    maxItems: number;
    default?: T[];
    examples?: string[];
  };
}>();

const dirty = ref(false);

const inputValue = computed({
  get() {
    if (!model.value && !dirty.value && props.definition.default) {
      return props.definition.default;
    }

    return model.value;
  },
  set(newValue: T[]) {
    dirty.value = true;
    model.value = newValue;
  }
});

const currentValue = computed(() => {
  if (inputValue.value.length === 0) {
    return (
      props.definition.examples?.[0] ||
      `Select up to ${props.definition.maxItems} items`
    );
  }

  const currentItems = props.definition.options.filter(option =>
    inputValue.value.includes(option.id)
  );

  return currentItems.map(item => item.name).join(', ');
});

function isItemDisabled(item: T) {
  if (inputValue.value.length < props.definition.maxItems) return false;
  return !inputValue.value.some(selectedItem => selectedItem === item);
}

watch(model, () => {
  dirty.value = true;
});
</script>

<template>
  <UiWrapperInput :definition="definition" :error="error" :dirty="dirty">
    <Listbox v-slot="{ open }" v-model="inputValue" multiple>
      <ListboxButton
        class="s-input !flex items-center justify-between"
        :class="{
          '!rounded-b-none': open
        }"
      >
        <span
          :class="{
            '!text-skin-text/40': inputValue.length === 0
          }"
        >
          {{ currentValue }}
        </span>
        <IH-chevron-down v-if="open" />
        <IH-chevron-up v-else />
      </ListboxButton>
      <ListboxOptions
        class="top-[59px] overflow-hidden bg-skin-border rounded-b-lg border-t-skin-text/10 border absolute z-30 w-full shadow-xl"
      >
        <div class="max-h-[208px] overflow-y-auto px-3">
          <ListboxOption
            v-for="item in definition.options"
            v-slot="{ selected, disabled }"
            :key="item.id"
            :value="item.id"
            class="flex items-center justify-between"
            :disabled="isItemDisabled(item.id)"
          >
            <span
              class="w-full py-2 text-skin-link"
              :class="{
                'opacity-40': disabled,
                'cursor-pointer': !disabled
              }"
            >
              {{ item.name }}
            </span>
            <IH-check v-if="selected" class="text-skin-success" />
          </ListboxOption>
        </div>
      </ListboxOptions>
    </Listbox>
  </UiWrapperInput>
</template>
