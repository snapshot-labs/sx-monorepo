<script setup lang="ts">
import { Tabs, TabsList } from '@ui-sdk/vue/tabs';

defineOptions({ inheritAttrs: false });

// The selected tab's value. Route tabs pass the current route, without v-model
const model = defineModel<string | number | null>();

// Number values, like an index, stay numbers
function select(value: string | null) {
  model.value =
    value !== null && typeof model.value === 'number' ? Number(value) : value;
}
</script>

<template>
  <Tabs :value="model == null ? null : String(model)" @value-change="select">
    <TabsList v-bind="$attrs">
      <slot />
    </TabsList>
  </Tabs>
</template>
