<script setup lang="ts" generic="T extends string | number">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger
} from '@ui-sdk/vue/select';
import type { DefinitionWithMultipleOptions } from '../../types';

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
const isOpen = ref(false);

const inputValue = computed({
  get: () => model.value || [],
  set: (newValue: T[]) => {
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
    <div>
      <Select
        v-model:value="inputValue"
        v-model:open="isOpen"
        multiple
        :modal="false"
      >
        <SelectTrigger
          class="s-input !flex items-start justify-between"
          :class="{
            '!rounded-b-none': isOpen
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
            <IH-chevron-up v-if="isOpen" />
            <IH-chevron-down v-else />
          </div>
        </SelectTrigger>
        <!-- Below the trigger and as wide as it, never flipping, like before -->
        <SelectContent
          side="bottom"
          align="end"
          :side-offset="0"
          class="m-0 p-0 w-[var(--anchor-width)] bg-skin-border rounded-b-lg border-t-skin-text/10 border shadow-xl overflow-hidden ![position-try-fallbacks:none]"
        >
          <div class="max-h-[208px] overflow-y-auto py-1">
            <SelectItem
              v-for="item in definition.options"
              v-slot="{ state }"
              :key="item.id"
              :value="item.id"
              :label="String(item.name || item.id)"
              :disabled="isItemDisabled(item.id)"
              class="flex items-center justify-between px-3 data-[highlighted]:bg-skin-link/[.08]"
            >
              <component :is="item.icon" class="size-[20px] mr-2" />
              <span
                class="w-full py-1.5 leading-6 text-skin-link"
                :class="{
                  'opacity-40': state.disabled,
                  'cursor-pointer': !state.disabled
                }"
              >
                {{ item.name || item.id }}
              </span>
              <IH-check v-if="state.selected" class="text-skin-success" />
            </SelectItem>
          </div>
        </SelectContent>
      </Select>
    </div>
  </UiWrapperInput>
</template>
