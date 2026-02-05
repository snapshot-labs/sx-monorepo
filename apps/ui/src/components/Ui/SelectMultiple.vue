<script setup lang="ts" generic="T extends string | number">
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions
} from '@headlessui/vue';
import { Float } from '@headlessui-float/vue';
import { DefinitionWithMultipleOptions } from '@/types';

defineOptions({ inheritAttrs: false });

const model = defineModel<T[]>({ required: true });

const props = defineProps<{
  error?: string;
  required?: boolean;
  definition: DefinitionWithMultipleOptions<T> & {
    maxItems?: number;
  };
}>();

const { isDirty } = useDirty(model, props.definition);

const inputValue = computed({
  get() {
    if (!model.value && !isDirty.value && props.definition.default) {
      return props.definition.default;
    }

    return model.value || [];
  },
  set(newValue: T[]) {
    model.value = newValue;
  }
});

const currentValue = computed(() => {
  if (inputValue.value.length === 0) {
    const fallbackText =
      props.definition.maxItems !== undefined
        ? `Select up to ${props.definition.maxItems} items`
        : 'Select one or more items';

    return props.definition.examples?.[0] || fallbackText;
  }

  const currentItems = props.definition.options.filter(option =>
    inputValue.value.includes(option.id)
  );

  return currentItems.map(item => item.name || item.id).join(', ');
});

function isItemDisabled(item: T) {
  if (props.definition.maxItems === undefined) return false;

  if (inputValue.value.length < props.definition.maxItems) return false;
  return !inputValue.value.some(selectedItem => selectedItem === item);
}
</script>

<template>
  <UiWrapperInput
    :definition="definition"
    :error="error"
    :dirty="isDirty"
    :required="required"
    class="relative"
  >
    <Listbox v-slot="{ open }" v-model="inputValue" multiple as="div">
      <Float adaptive-width strategy="fixed" placement="bottom-end">
        <ListboxButton
          class="s-input !flex items-start justify-between"
          :class="{
            '!rounded-b-none': open
          }"
        >
          <span
            class="text-left"
            :class="{
              '!text-skin-text/40': inputValue.length === 0
            }"
          >
            {{ currentValue }}
          </span>
          <div class="shrink-0 relative top-1">
            <IH-chevron-up v-if="open" />
            <IH-chevron-down v-else />
          </div>
        </ListboxButton>
        <ListboxOptions
          class="w-full bg-skin-border rounded-b-lg border-t-skin-text/10 border shadow-xl overflow-hidden"
        >
          <div class="max-h-[208px] overflow-y-auto">
            <ListboxOption
              v-for="item in definition.options"
              v-slot="{ active, selected, disabled }"
              :key="item.id"
              :value="item.id"
              :disabled="isItemDisabled(item.id)"
              as="template"
            >
              <li
                class="flex items-center justify-between px-3"
                :class="{
                  'bg-skin-bg/25': active
                }"
              >
                <component :is="item.icon" class="size-[20px] mr-2" />
                <span
                  class="w-full py-2 text-skin-link"
                  :class="{
                    'opacity-40': disabled,
                    'cursor-pointer': !disabled
                  }"
                >
                  {{ item.name || item.id }}
                </span>
                <IH-check v-if="selected" class="text-skin-success" />
              </li>
            </ListboxOption>
          </div>
        </ListboxOptions>
      </Float>
    </Listbox>
  </UiWrapperInput>
</template>
