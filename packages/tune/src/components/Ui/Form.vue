<script setup lang="ts">
import Form from './Form.vue';
import InputArray from './InputArray.vue';
import InputCheckbox from './InputCheckbox.vue';
import InputDuration from './InputDuration.vue';
import InputNumber from './InputNumber.vue';
import InputString from './InputString.vue';
import Select from './Select.vue';
import SelectMultiple from './SelectMultiple.vue';
import Textarea from './Textarea.vue';
import { useDirty } from '../../composables/useDirty';
import {
  FieldDefinition,
  FormComponentResolver,
  ObjectFieldDefinition
} from '../../types';

defineOptions({ inheritAttrs: false });

const model = defineModel<Record<string, unknown>>({ required: true });

const props = defineProps<{
  error?: Record<string, unknown>;
  definition: ObjectFieldDefinition;
  path?: string;
}>();

const resolveComponent = inject<FormComponentResolver | null>(
  'formComponentResolver',
  null
);

const slots = useSlots();
const { isDirty } = useDirty(model, props.definition);

const inputValue = computed<Record<string, unknown>>({
  get() {
    if (!model.value && !isDirty.value && props.definition.default) {
      return props.definition.default;
    }

    return model.value || {};
  },
  set(newValue) {
    model.value = newValue;
  }
});

const getComponent = (property: FieldDefinition) => {
  const custom = resolveComponent?.(property);
  if (custom) return custom;

  const type = Array.isArray(property.type) ? property.type[0] : property.type;

  switch (type) {
    case 'object':
      return Form;
    case 'array':
      if (property.items?.enum) {
        return SelectMultiple;
      }
      return InputArray;
    case 'string':
      if (property.format === 'long') return Textarea;
      if (property.enum) return Select;
      if (property.format) return null;
      return InputString;
    case 'number':
    case 'integer':
      if (property.format === 'duration') return InputDuration;
      if (property.format) return null;
      return InputNumber;
    case 'boolean':
      return InputCheckbox;
    default:
      return null;
  }
};

const getPropertySlots = (propertyName: string) => {
  const propertySlots: Record<string, string> = {};
  const prefix = `${propertyName}-`;

  Object.keys(slots).forEach(slotName => {
    if (slotName.startsWith(prefix)) {
      const suffix = slotName.slice(prefix.length);
      if (suffix) {
        propertySlots[suffix] = slotName;
      }
    }
  });

  return propertySlots;
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
    >
      <template
        v-for="(sourceSlot, targetSlot) in getPropertySlots(i.toString())"
        :key="targetSlot"
        #[targetSlot]="slotProps"
      >
        <slot :name="sourceSlot" v-bind="slotProps" />
      </template>
    </component>
  </div>
</template>
