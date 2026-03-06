<script setup lang="ts">
import { useDirty } from '../../composables/useDirty';
import { FieldDefinition } from '../../types';

defineOptions({ inheritAttrs: false });

const model = defineModel<string>({
  required: true
});

const props = defineProps<{
  error?: string;
  required?: boolean;
  definition: FieldDefinition<string>;
}>();

const { isDirty } = useDirty(model, props.definition);

const inputValue = computed<string>({
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
    :input-value-length="inputValue?.length"
  >
    <UiRawInputAmount
      :id="id"
      v-model="inputValue"
      class="s-input"
      v-bind="$attrs"
      :placeholder="
        definition.examples?.[0] ? String(definition.examples[0]) : undefined
      "
    />
  </UiWrapperInput>
</template>
