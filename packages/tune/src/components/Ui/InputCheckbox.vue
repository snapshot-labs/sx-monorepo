<script setup lang="ts">
import { useDirty } from '../../composables/useDirty';
import { FieldDefinition } from '../../types';

const model = defineModel<boolean>({ required: true });

const props = defineProps<{
  error?: string;
  required?: boolean;
  definition: FieldDefinition<boolean>;
}>();

const { isDirty } = useDirty(model, props.definition);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { title, ...wrapperDefinition } = props.definition;

const inputValue = computed<boolean>({
  get() {
    if (
      model.value === undefined &&
      !isDirty.value &&
      props.definition.default !== undefined
    ) {
      return props.definition.default;
    }

    return model.value ?? false;
  },
  set(newValue) {
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
    :definition="wrapperDefinition"
    :error="error"
    :dirty="isDirty"
  >
    <UiCheckbox v-model="inputValue" :title="definition.title" />
  </UiWrapperInput>
</template>
