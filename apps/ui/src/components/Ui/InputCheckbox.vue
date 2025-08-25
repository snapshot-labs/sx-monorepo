<script setup lang="ts">
const model = defineModel<boolean>();

const props = defineProps<{
  error?: string;
  required?: boolean;
  definition: any;
}>();

const { isDirty } = useDirty(model, props.definition);

const inputValue = computed({
  get() {
    if (
      model.value === undefined &&
      !isDirty.value &&
      props.definition.default !== undefined
    ) {
      return props.definition.default;
    }

    return model.value;
  },
  set(newValue: boolean) {
    model.value = newValue;
  }
});

onMounted(() => {
  if (model.value === undefined && !isDirty.value) {
    model.value = props.definition.default ?? false;
  }
});
</script>

<template>
  <UiWrapperInput
    v-slot="{ id }"
    :definition="definition"
    :error="error"
    :dirty="isDirty"
  >
    <input :id="id" v-model="inputValue" type="checkbox" class="mt-[7px]" />
  </UiWrapperInput>
</template>
