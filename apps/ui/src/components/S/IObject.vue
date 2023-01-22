<script lang="ts">
export default {
  inheritAttrs: false
};
</script>

<script setup lang="ts">
import { ref, computed } from 'vue';

import IObject from './IObject.vue';
import IArray from './IArray.vue';
import IString from './IString.vue';
import IText from './IText.vue';
import IAddress from './IAddress.vue';
import INumber from './INumber.vue';
import IBoolean from './IBoolean.vue';

const props = defineProps<{
  modelValue: any;
  error: any;
  definition: any;
  path?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: any);
}>();

const dirty = ref(false);

const inputValue = computed({
  get() {
    if (!props.modelValue && !dirty.value && props.definition.default) {
      return props.definition.default;
    }

    return props.modelValue;
  },
  set(newValue) {
    dirty.value = true;

    emit('update:modelValue', newValue);
  }
});

const getComponent = (name: string, format: string) => {
  switch (name) {
    case 'object':
      return IObject;
    case 'array':
      return IArray;
    case 'string':
      if (format === 'long') return IText;
      if (format === 'address') return IAddress;
      return IString;
    case 'number':
      return INumber;
    case 'boolean':
      return IBoolean;
    default:
      return null;
  }
};
</script>

<template>
  <component
    :is="getComponent(property.type, property.format)"
    v-for="(property, i) in definition.properties"
    :key="i"
    v-bind="$attrs"
    v-model="inputValue[i]"
    :path="path ? `${path}.${i}` : i"
    :definition="property"
    :error="error?.[i]"
  />
</template>
