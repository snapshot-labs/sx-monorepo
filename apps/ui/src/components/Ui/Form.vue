<script setup lang="ts">
import {
  FieldDefinition,
  ObjectFieldDefinition,
  UiForm,
  UiTextarea
} from '@snapshot-labs/tune';
import InputAddress from './InputAddress.vue';
import InputColor from './InputColor.vue';
import InputStamp from './InputStamp.vue';
import SelectorNetwork from './SelectorNetwork.vue';

defineOptions({ inheritAttrs: false });

const model = defineModel<Record<string, unknown>>({ required: true });

defineProps<{
  error?: Record<string, unknown>;
  definition: ObjectFieldDefinition;
  path?: string;
}>();

function resolveComponent(property: FieldDefinition): Component | null {
  switch (property.format) {
    case 'address':
    case 'ens-or-address':
      return InputAddress;
    case 'addresses-with-voting-power':
      return UiTextarea;
    case 'stamp':
      return InputStamp;
    case 'color':
      return InputColor;
    case 'network':
      return SelectorNetwork;
    default:
      return null;
  }
}

provide('formComponentResolver', resolveComponent);
</script>

<template>
  <UiForm
    v-bind="$attrs"
    v-model="model"
    :definition="definition"
    :error="error"
    :path="path"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
  </UiForm>
</template>
