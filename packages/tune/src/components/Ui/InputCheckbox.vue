<script setup lang="ts">
const model = defineModel<boolean>();

const props = defineProps<{
  error?: string;
  required?: boolean;
  definition: any;
}>();

// Set default synchronously before useDirty so the initial value
// is already present, avoiding a brief dirty/error flash on first render.
if (model.value === undefined) {
  model.value = props.definition.default ?? false;
}

const { isDirty } = useDirty(model, props.definition);
</script>

<template>
  <UiWrapperInput
    v-slot="{ control }"
    :definition="definition"
    :error="error"
    :dirty="isDirty"
  >
    <input v-bind="control" v-model="model" type="checkbox" class="mt-[7px]" />
  </UiWrapperInput>
</template>
