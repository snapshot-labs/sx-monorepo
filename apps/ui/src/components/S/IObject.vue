<script setup>
import { ref, watch } from 'vue';

import IObject from './IObject.vue';
import IArray from './IArray.vue';
import IString from './IString.vue';
import INumber from './INumber.vue';
import IBoolean from './IBoolean.vue';

const props = defineProps({
  modelValue: Object,
  definition: Object
});

const emit = defineEmits(['update:modelValue']);

const input = ref(props.modelValue || props.definition.default || {});

const getComponent = name => {
  switch (name) {
    case 'object':
      return IObject;
    case 'array':
      return IArray;
    case 'string':
      return IString;
    case 'number':
      return INumber;
    case 'boolean':
      return IBoolean;
    default:
      return null;
  }
};

watch(input, () => emit('update:modelValue', input.value));
</script>

<template>
  <component
    v-for="(property, i) in definition.properties"
    :key="i"
    :is="getComponent(property.type)"
    :definition="property"
    v-model="input[i]"
  />
</template>
