<script setup lang="ts">
import { Input } from '@ui-sdk/vue/input';

const model = defineModel<string>();

// Like v-model.trim: the model is trimmed as you type, the field on blur
const { text, update } = useFieldText(model, value => value.trim());
</script>

<template>
  <Input
    :value="text"
    type="text"
    @value-change="update"
    @change="text = text.trim()"
  />
</template>
