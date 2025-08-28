<script setup lang="ts" generic="T extends string | number">
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions
} from '@headlessui/vue';
import { Float } from '@headlessui-float/vue';
import { omit } from '@/helpers/utils';
import { DefinitionWithOptions } from '@/types';

const NULL_SYMBOL = Symbol('null');

const model = defineModel<T | null>({ required: true });

const props = defineProps<{
  error?: string;
  inline?: boolean;
  definition: DefinitionWithOptions<T | null>;
  gap?: number;
  required?: boolean;
}>();

const { isDirty } = useDirty(model, props.definition);
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
    if (!model.value && !isDirty.value && props.definition.default) {
      return props.definition.default;
    }

    return model.value;
  },
  set(newValue: T | null) {
    query.value = '';
    model.value = newValue;
  }
});

const content = computed(() => query.value || getDisplayValue(model.value));
const icon = computed(() => {
  const option = props.definition.options.find(
    option => option.id === model.value
  );
  return option ? option.icon : null;
});

function handleFocus(event: FocusEvent, open: boolean) {
  if (!event.target || open) return;

  query.value = '';

  requestAnimationFrame(() => {
    (event.target as HTMLInputElement).select();
  });
}

function getDisplayValue(value: T | null) {
  if (value === null) return '';

  const option = props.definition.options.find(option => option.id === value);
  return option ? option.name || String(option.id) : '';
}
</script>

<template>
  <UiWrapperInput
    :definition="inline ? omit(definition, ['title']) : definition"
    :error="error"
    :dirty="isDirty"
    :required="required"
    class="relative w-auto"
    :class="{
      'mb-[14px]': !inline
    }"
  >
    <Combobox v-slot="{ open }" v-model="inputValue" as="div" nullable>
      <Float
        :adaptive-width="inline ? false : true"
        strategy="fixed"
        placement="bottom-start"
        :offset="gap && inline ? gap : 0"
      >
        <div
          :class="{
            relative: inline
          }"
        >
          <ComboboxButton
            as="div"
            :data-value="content"
            :class="{
              sizer: inline,
              'sizer-with-icon': inline && icon
            }"
          >
            <component
              :is="icon"
              class="absolute size-[20px] left-3 bottom-2.5"
            />
            <ComboboxInput
              class="s-input !flex items-center justify-between !mb-0"
              :class="{
                '!rounded-b-none': !gap && open,
                'h-[42px] min-w-11': inline,
                '!pl-[42px]': icon
              }"
              :size="'1'"
              autocomplete="off"
              :placeholder="definition.examples?.[0]"
              :display-value="item => getDisplayValue(item as T)"
              @keydown.enter="() => (query = '')"
              @change="e => (query = e.target.value)"
              @focus="event => handleFocus(event, open)"
            />
          </ComboboxButton>
          <ComboboxButton v-if="!inline" class="absolute right-3 bottom-[14px]">
            <IH-chevron-up v-if="open" />
            <IH-chevron-down v-else />
          </ComboboxButton>
          <div
            v-if="inline"
            class="absolute top-[-7px] bg-skin-bg px-1 left-2.5 text-sm text-skin-text leading-4"
          >
            {{ definition.title }}
          </div>
        </div>
        <ComboboxOptions
          class="w-full bg-skin-border border-t-skin-text/10 border shadow-xl overflow-hidden"
          :class="
            inline ? 'max-w-[80vw] sm:max-w-[300px] rounded-lg' : 'rounded-b-lg'
          "
        >
          <div class="max-h-[208px] overflow-y-auto">
            <div
              v-if="filteredOptions.length === 0 && query !== ''"
              class="relative cursor-default select-none text-center py-2 px-3"
            >
              No results for your search
            </div>

            <ComboboxOption
              v-for="item in filteredOptions"
              v-slot="{ selected, disabled, active }"
              :key="item.id ?? NULL_SYMBOL"
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
                  class="w-full py-2 text-skin-link truncate"
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

<style lang="scss" scoped>
.sizer {
  @apply inline-grid items-center;

  input {
    @apply col-start-1 row-start-1;
  }

  &::after {
    content: attr(data-value);
    @apply px-3 border-x col-start-1 row-start-1;
    visibility: hidden;
    white-space: nowrap;
  }

  &.sizer-with-icon::after {
    @apply pl-[42px];
  }
}
</style>
