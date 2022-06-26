<script setup>
import { ref, computed } from 'vue';

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

const dirty = ref(false);

const inputValue = computed({
  get() {
    if (!props.value && !dirty.value && props.definition.default) {
      return props.definition.default;
    }

    return props.modelValue;
  },
  set(newValue) {
    dirty.value = true;

    emit('update:modelValue', newValue);
  }
});

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
</script>

<template>
  <component
    v-for="(property, i) in definition.properties"
    :key="i"
    :is="getComponent(property.type)"
    :definition="property"
    v-model="inputValue[i]"
  />
</template>
