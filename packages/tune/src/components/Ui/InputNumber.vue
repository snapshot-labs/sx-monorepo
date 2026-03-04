<script setup lang="ts">
import { useDirty } from '../../composables/useDirty';
import { FieldDefinition } from '../../types';

const model = defineModel<string | number>();

const props = withDefaults(
  defineProps<{
    error?: string;
    definition: FieldDefinition<string | number>;
    disabled?: boolean;
    required?: boolean;
  }>(),
  { disabled: false }
);

const { isDirty } = useDirty(model, props.definition);

const inputValue = computed<string | number | undefined>({
  get() {
    if (!model.value && !isDirty.value && props.definition.default) {
      return props.definition.default;
    }

    return model.value;
  },
  set(newValue) {
    model.value = newValue;
  }
});
</script>

<template>
  <UiWrapperInput
    v-slot="{ id }"
    :definition="definition"
    :error="error"
    :dirty="isDirty"
    :required="required"
  >
    <input
      :id="id"
      v-model="inputValue"
      type="number"
      class="s-input"
      :disabled="disabled"
      :class="{ '!text-skin-text': disabled }"
      v-bind="$attrs"
      :placeholder="definition.examples && String(definition.examples[0])"
      :min="definition.minimum"
      :max="definition.maximum"
    />
  </UiWrapperInput>
</template>
