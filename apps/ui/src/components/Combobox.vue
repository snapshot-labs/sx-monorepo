<script setup lang="ts" generic="T extends string | number">
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions
} from '@headlessui/vue';
import { Float } from '@headlessui-float/vue';
import { DefinitionWithOptions } from '@/types';

defineOptions({ inheritAttrs: false });

const model = defineModel<T>({ required: true });

const props = defineProps<{
  error?: string;
  definition: DefinitionWithOptions<T>;
}>();

const dirty = ref(false);
const query = ref('');

const filteredOptions = computed(() => {
  return props.definition.options.filter(option =>
    (option.name || String(option.id))
      .toLowerCase()
      .includes(query.value.toLowerCase())
  );
});

const inputValue = computed({
  get() {
    if (!model.value && !dirty.value && props.definition.default) {
      return props.definition.default;
    }

    return model.value;
  },
  set(newValue: T) {
    dirty.value = true;
    model.value = newValue;
  }
});

function handleFocus(event: FocusEvent, open: boolean) {
  if (!event.target || open) return;

  (event.target as HTMLInputElement).select();
}

function getDisplayValue(value: T) {
  const option = props.definition.options.find(option => option.id === value);
  return option ? option.name || String(option.id) : '';
}

watch(model, () => {
  dirty.value = true;
});
</script>

<template>
  <UiWrapperInput
    :definition="definition"
    :error="error"
    :dirty="dirty"
    class="relative mb-[14px]"
  >
    <Combobox v-slot="{ open }" v-model="inputValue" as="div">
      <Float adaptive-width strategy="fixed" placement="bottom-end">
        <div>
          <ComboboxButton class="w-full">
            <ComboboxInput
              class="s-input !flex items-center justify-between !mb-0"
              :class="{
                '!rounded-b-none': open
              }"
              autocomplete="off"
              :placeholder="definition.examples?.[0]"
              :display-value="item => getDisplayValue(item as T)"
              @change="e => (query = e.target.value)"
              @focus="event => handleFocus(event, open)"
            />
          </ComboboxButton>
          <ComboboxButton class="absolute right-3 bottom-[14px]">
            <IH-chevron-up v-if="open" />
            <IH-chevron-down v-else />
          </ComboboxButton>
        </div>
        <ComboboxOptions
          class="w-full bg-skin-border rounded-b-lg border-t-skin-text/10 border shadow-xl overflow-hidden"
        >
          <div class="max-h-[208px] overflow-y-auto">
            <ComboboxOption
              v-for="item in filteredOptions"
              v-slot="{ selected, disabled, active }"
              :key="item.id"
              :value="item.id"
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
            </ComboboxOption>
          </div>
        </ComboboxOptions>
      </Float>
    </Combobox>
  </UiWrapperInput>
</template>
