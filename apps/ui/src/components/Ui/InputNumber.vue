<script setup lang="ts">
const model = defineModel<string | number>();

const props = withDefaults(
  defineProps<{
    error?: string;
    definition: any;
    disabled?: boolean;
    required?: boolean;
  }>(),
  { disabled: false }
);

const { isDirty } = useDirty(model, props.definition);
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
      v-model="model"
      type="number"
      class="s-input"
      :disabled="disabled"
      :class="{ '!text-skin-text': disabled }"
      v-bind="$attrs"
      :placeholder="definition.examples && definition.examples[0]"
      :min="definition.minimum"
      :max="definition.maximum"
    />
  </UiWrapperInput>
</template>
