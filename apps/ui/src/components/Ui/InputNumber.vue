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

const inputValue = computed({
  get() {
    if (!model.value && !isDirty.value && props.definition.default) {
      return props.definition.default;
    }

    return model.value;
  },
  set(newValue: string) {
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
      :placeholder="definition.examples && definition.examples[0]"
      :min="definition.minimum"
      :max="definition.maximum"
    />
  </UiWrapperInput>
</template>
