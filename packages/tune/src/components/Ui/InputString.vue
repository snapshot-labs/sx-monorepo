<script setup lang="ts">
import { useDirty } from '../../composables/useDirty';
import { FieldDefinition } from '../../types';

defineOptions({ inheritAttrs: false });

const model = defineModel<string>();

const props = defineProps<{
  loading?: boolean;
  error?: string;
  required?: boolean;
  definition: FieldDefinition<string>;
}>();

const { isDirty } = useDirty(model, props.definition);

const inputValue = computed<string | undefined>({
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
    <div class="relative">
      <div
        v-if="$slots.prefix"
        class="absolute left-3 top-1/2 -translate-y-1/2 z-10"
      >
        <slot name="prefix" />
      </div>
      <input
        :id="id"
        v-model.trim="inputValue"
        type="text"
        class="s-input"
        v-bind="$attrs"
        :placeholder="
          definition.examples?.[0] ? String(definition.examples[0]) : undefined
        "
      />
      <div
        v-if="$slots.suffix"
        class="absolute right-3 top-1/2 -translate-y-1/2 z-10"
      >
        <slot name="suffix" />
      </div>
    </div>
  </UiWrapperInput>
</template>
