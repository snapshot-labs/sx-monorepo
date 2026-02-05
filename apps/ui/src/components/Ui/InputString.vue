<script lang="ts">
export default {
  inheritAttrs: false
};
</script>

<script setup lang="ts">
const model = defineModel<string>();

const props = defineProps<{
  loading?: boolean;
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

// From AJV string length validation
// See https://github.com/ajv-validator/ajv/blob/master/lib/runtime/ucs2length.ts
const inputLength = computed(() => {
  const str = inputValue.value || '';
  const len = str.length;
  let length = 0;
  let pos = 0;
  let value: number;
  while (pos < len) {
    length++;
    value = str.charCodeAt(pos++);
    if (value >= 0xd800 && value <= 0xdbff && pos < len) {
      value = str.charCodeAt(pos);
      if ((value & 0xfc00) === 0xdc00) pos++;
    }
  }
  return length;
});
</script>

<template>
  <UiWrapperInput
    v-slot="{ id }"
    :definition="definition"
    :loading="loading"
    :error="error"
    :dirty="isDirty"
    :required="required"
    :input-value-length="inputLength"
  >
    <input
      :id="id"
      v-model.trim="inputValue"
      type="text"
      class="s-input"
      v-bind="$attrs"
      :placeholder="definition.examples && definition.examples[0]"
    />
  </UiWrapperInput>
</template>
