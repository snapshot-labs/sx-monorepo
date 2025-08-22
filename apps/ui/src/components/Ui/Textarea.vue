<script lang="ts">
export default {
  inheritAttrs: false
};
</script>

<script setup lang="ts">
const model = defineModel<string>();

const props = defineProps<{
  error?: string;
  required?: boolean;
  definition: any;
}>();

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
    :input-value-length="inputValue?.length"
  >
    <textarea
      :id="id"
      v-model="inputValue"
      class="s-input"
      v-bind="$attrs"
      :placeholder="definition.examples && definition.examples[0]"
    />
  </UiWrapperInput>
</template>
