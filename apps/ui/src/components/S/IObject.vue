<script lang="ts">
export default {
  inheritAttrs: false
};
</script>

<script setup lang="ts">
import IObject from './IObject.vue';
import IArray from './IArray.vue';
import IString from './IString.vue';
import IText from './IText.vue';
import IAddress from './IAddress.vue';
import IDuration from './IDuration.vue';
import INumber from './INumber.vue';
import IBoolean from './IBoolean.vue';
import ISelect from './ISelect.vue';
import IStamp from './IStamp.vue';

const model = defineModel<any>({ required: true });

const props = defineProps<{
  error: any;
  definition: any;
  path?: string;
}>();

const dirty = ref(false);

const inputValue = computed({
  get() {
    if (!model.value && !dirty.value && props.definition.default) {
      return props.definition.default;
    }

    return model.value;
  },
  set(newValue) {
    dirty.value = true;
    model.value = newValue;
  }
});

const getComponent = (property: { type: string; format: string; enum?: string[] }) => {
  let type = property.type;
  if (Array.isArray(property.type)) {
    type = property.type[0];
  }
  switch (type) {
    case 'object':
      return IObject;
    case 'array':
      return IArray;
    case 'string':
      if (property.format === 'long') return IText;
      if (property.format === 'address') return IAddress;
      if (property.format === 'ens-or-address') return IAddress;
      if (property.format === 'stamp') return IStamp;
      if (property.enum) return ISelect;
      return IString;
    case 'number':
    case 'integer':
      if (property.format === 'duration') return IDuration;
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
    :is="getComponent(property)"
    v-for="(property, i) in definition.properties"
    :key="i"
    v-bind="$attrs"
    v-model="inputValue[i]"
    :path="path ? `${path}.${i}` : i"
    :definition="property"
    :error="error?.[i]"
  />
</template>
