<script setup lang="ts">
const model = defineModel<boolean>();

const props = defineProps<{
  error?: string;
  required?: boolean;
  definition: any;
}>();

const dirty = ref(false);

const inputValue = computed({
  get() {
    if (
      model.value === undefined &&
      !dirty.value &&
      props.definition.default !== undefined
    ) {
      return props.definition.default;
    }

    return model.value;
  },
  set(newValue: boolean) {
    dirty.value = true;
    model.value = newValue;
  }
});

watch(model, () => {
  dirty.value = true;
});
</script>

<template>
  <UiWrapperInput
    :definition="definition"
    :error="error"
    :dirty="dirty"
    :required="required"
  >
    <input v-model="inputValue" type="checkbox" />
  </UiWrapperInput>
</template>
