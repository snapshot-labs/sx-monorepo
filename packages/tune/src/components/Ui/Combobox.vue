<script setup lang="ts" generic="T extends string | number">
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger
} from '@ui-sdk/vue/combobox';
import { omit } from '../../helpers/utils';
import type { DefinitionWithOptions, SelectItem } from '../../types';

const model = defineModel<T | null>({ required: true });

const props = defineProps<{
  error?: string;
  inline?: boolean;
  definition: DefinitionWithOptions<T | null>;
  gap?: number;
  required?: boolean;
}>();

const { isDirty } = useDirty(model, props.definition);
const isOpen = ref(false);
// The input's text: the chosen option's label, or what the user types
const query = ref(getDisplayValue(model.value));

const content = computed(() => query.value || getDisplayValue(model.value));

// Follow the value and options while closed: a value set from outside, or
// options that load after the value, show their label
watch(
  () => getDisplayValue(model.value),
  label => {
    if (!isOpen.value) query.value = label;
  }
);
const icon = computed(() => {
  const option = props.definition.options.find(
    option => option.id === model.value
  );
  return option ? option.icon : null;
});

// UI SDK puts the cursor where you click: select the label instead, so
// typing a search replaces it
function selectOnFocus(event: FocusEvent) {
  const input = event.target as HTMLInputElement;
  requestAnimationFrame(() => input.select());
}

function getLabel(option: SelectItem<T | null>) {
  return option.name || String(option.id);
}

function getDisplayValue(value: T | null) {
  if (value === null) return '';

  const option = props.definition.options.find(option => option.id === value);
  return option ? getLabel(option) : '';
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
    <div>
      <Combobox
        v-model:value="model"
        v-model:query="query"
        v-model:open="isOpen"
        filter="contains"
        auto-highlight="always"
        :item-to-label="value => getDisplayValue(value as T | null)"
        :modal="false"
      >
        <div
          :class="{
            relative: inline
          }"
        >
          <div
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
                '!rounded-b-none': !gap && isOpen,
                'h-[42px] min-w-11': inline,
                '!pl-[42px]': icon
              }"
              :size="1"
              autocomplete="off"
              :placeholder="definition.examples?.[0]"
              :aria-label="definition.title"
              @focus="selectOnFocus"
            />
          </div>
          <ComboboxTrigger
            v-if="!inline"
            class="absolute right-3 bottom-[14px]"
          >
            <IH-chevron-up v-if="isOpen" />
            <IH-chevron-down v-else />
          </ComboboxTrigger>
          <div
            v-if="inline"
            class="absolute top-[-7px] bg-skin-bg px-1 left-2.5 text-sm text-skin-text leading-4"
          >
            {{ definition.title }}
          </div>
        </div>
        <ComboboxContent
          side="bottom"
          align="start"
          :side-offset="gap && inline ? gap : 0"
          class="m-0 p-0 bg-skin-border shadow-xl overflow-hidden ![position-try-fallbacks:none]"
          :class="
            inline
              ? 'max-w-[80vw] sm:max-w-[300px] rounded-lg border-0'
              : 'w-[var(--anchor-width)] rounded-b-lg border border-t-skin-text/10'
          "
        >
          <ComboboxList class="max-h-[208px] overflow-y-auto py-1">
            <ComboboxEmpty
              class="relative cursor-default select-none text-center data-[empty]:py-2 data-[empty]:px-3"
            >
              No results for your search
            </ComboboxEmpty>
            <ComboboxItem
              v-for="item in definition.options"
              v-slot="{ state }"
              :key="String(item.id)"
              :value="item.id"
              :label="getLabel(item)"
              class="flex items-center justify-between px-3 data-[highlighted]:bg-skin-link/[.08]"
            >
              <component :is="item.icon" class="size-[20px] mr-2" />
              <span
                class="w-full py-1.5 leading-6 text-skin-link truncate"
                :class="{
                  'opacity-40': state.disabled,
                  'cursor-pointer': !state.disabled
                }"
              >
                {{ getLabel(item) }}
              </span>
              <IH-check v-if="state.selected" class="text-skin-success" />
            </ComboboxItem>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
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
