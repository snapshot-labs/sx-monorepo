import { FieldDefinition } from '../types';

export function useDirty<T>(
  model: Ref<T | undefined>,
  definition: Pick<FieldDefinition<T>, 'default'> = {}
) {
  const isModelModified = ref(false);

  const isDirty = computed(() => {
    if (isModelModified.value) return true;
    if (definition.default) return model.value !== definition.default;
    return !!model.value;
  });

  watch(model, () => {
    isModelModified.value = true;
  });

  return {
    isDirty
  };
}
