<script setup lang="ts">
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  useFieldControl
} from '@ui-sdk/vue/field';
import { _n } from '../../helpers/number';

const props = withDefaults(
  defineProps<{
    loading?: boolean;
    definition: any;
    inputValueLength?: number;
    error?: string;
    dirty?: boolean;
    required?: boolean;
  }>(),
  { inputValueLength: 0 }
);

const showError = computed(() => !!props.error && props.dirty);

// Hands the field's props (id, aria-describedby...) to the control in the slot
const FieldControlProps = defineComponent((_, { slots }) => {
  const field = useFieldControl();
  return () =>
    slots.default?.({
      control: field?.props({}) ?? {}
    });
});
</script>

<template>
  <!-- Our own rule decides when it's invalid, never the browser's -->
  <Field
    class="s-base"
    :class="showError ? 's-error' : ''"
    :invalid="showError"
  >
    <div class="relative">
      <div class="!flex justify-between s-label w-full gap-1">
        <FieldLabel
          v-if="definition.title"
          class="truncate flex items-center gap-1"
        >
          {{ definition.title }}{{ required ? ' *' : '' }}
          <UiTooltip v-if="definition.tooltip" :title="definition.tooltip">
            <IH-question-mark-circle class="shrink-0" />
          </UiTooltip>
        </FieldLabel>
        <UiLoading v-if="loading" :size="16" />
        <div
          v-else-if="inputValueLength >= 0 && definition.maxLength"
          class="text-sm hidden grow text-right s-label-char-count whitespace-nowrap"
        >
          {{ _n(inputValueLength) }} / {{ _n(definition.maxLength) }}
        </div>
      </div>
      <FieldControlProps v-slot="{ control }">
        <slot :control="control" />
      </FieldControlProps>
    </div>
    <FieldError v-if="showError" :match="true">
      <template #render="{ props: errorProps }">
        <span v-bind="errorProps" class="s-input-error-message">{{
          error
        }}</span>
      </template>
    </FieldError>
    <FieldDescription v-if="definition.description">
      <template #render="{ props: descriptionProps }">
        <legend v-bind="descriptionProps" v-text="definition.description" />
      </template>
    </FieldDescription>
  </Field>
</template>
