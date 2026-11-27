<script setup lang="ts">
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
</script>

<template>
  <UiWrapperInput
    v-slot="{ control }"
    :definition="definition"
    :error="error"
    :dirty="isDirty"
    :required="required"
    :loading="loading"
  >
    <input
      v-model="model"
      type="number"
      class="s-input"
      :disabled="disabled"
      :class="{ '!text-skin-text': disabled }"
      v-bind="{ ...control, ...$attrs }"
      :placeholder="definition.examples && definition.examples[0]"
      :min="definition.minimum"
      :max="definition.maximum"
    />
  </UiWrapperInput>
</template>
