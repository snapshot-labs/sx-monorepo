<script setup lang="ts">
import { Input } from '@ui-sdk/vue/input';

const model = defineModel<string | number>();

const props = withDefaults(
  defineProps<{
    error?: string;
    definition: any;
    disabled?: boolean;
    required?: boolean;
    loading?: boolean;
  }>(),
  { disabled: false }
);

const { isDirty } = useDirty(model, props.definition);

// Like v-model on a number input: a number once it parses, else the text
function toNumber(value: string) {
  const number = parseFloat(value);
  return isNaN(number) ? value : number;
}

const text = useFieldText(model, toNumber);

function update(value: string) {
  text.value = value;
  model.value = toNumber(value);
}
</script>

<template>
  <UiWrapperInput
    :definition="definition"
    :error="error"
    :dirty="isDirty"
    :required="required"
    :loading="loading"
  >
    <Input
      :value="text"
      type="number"
      class="s-input"
      :disabled="disabled"
      :class="{ '!text-skin-text': disabled }"
      v-bind="$attrs"
      :placeholder="definition.examples && definition.examples[0]"
      :min="definition.minimum"
      :max="definition.maximum"
      @value-change="update"
    />
  </UiWrapperInput>
</template>
