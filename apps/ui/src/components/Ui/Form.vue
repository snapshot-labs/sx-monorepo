<script lang="ts">
export default {
  inheritAttrs: false
};
</script>

<script setup lang="ts">
import Form from './Form.vue';
import InputAddress from './InputAddress.vue';
import InputCheckbox from './InputCheckbox.vue';
import InputColor from './InputColor.vue';
import InputDuration from './InputDuration.vue';
import InputNumber from './InputNumber.vue';
import InputStamp from './InputStamp.vue';
import InputString from './InputString.vue';
import Select from './Select.vue';
import SelectMultiple from './SelectMultiple.vue';
import SelectorNetwork from './SelectorNetwork.vue';
import Textarea from './Textarea.vue';

const model = defineModel<any>({ required: true });

const props = defineProps<{
  error: any;
  definition: any;
  path?: string;
}>();

const { isDirty } = useDirty(model, props.definition);

const inputValue = computed({
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

const getComponent = (property: {
  type: string;
  format: string;
  enum?: string[];
  items: {
    type: string;
    enum?: string[];
  };
  maxItems?: number;
}) => {
  let type = property.type;
  if (Array.isArray(property.type)) {
    type = property.type[0];
  }

  switch (type) {
    case 'object':
      return Form;
    case 'array':
      if (property.items.enum) {
        return SelectMultiple;
      }

      return null;
    case 'string':
      if (property.format === 'long') return Textarea;
      if (property.format === 'addresses-with-voting-power') return Textarea;
      if (property.format === 'address') return InputAddress;
      if (property.format === 'ens-or-address') return InputAddress;
      if (property.format === 'stamp') return InputStamp;
      if (property.format === 'color') return InputColor;
      if (property.format === 'network') return SelectorNetwork;
      if (property.enum) return Select;
      return InputString;
    case 'number':
    case 'integer':
      if (property.format === 'network') return SelectorNetwork;
      if (property.format === 'duration') return InputDuration;
      return InputNumber;
    case 'boolean':
      return InputCheckbox;
    default:
      return null;
  }
};
</script>

<template>
  <div class="s-form">
    <component
      :is="getComponent(property)"
      v-for="(property, i) in definition.properties"
      :key="i"
      v-bind="$attrs"
      v-model="inputValue[i]"
      :path="path ? `${path}.${i}` : i"
      :definition="property"
      :error="error?.[i]"
      :required="definition.required?.includes(i)"
    />
  </div>
</template>
