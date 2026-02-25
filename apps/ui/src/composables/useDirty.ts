import { computed, ref, Ref, watch } from 'vue';

export interface Definition<T> {
  default?: T;
}

export function useDirty<T>(model: Ref<T>, definition: Definition<T> = {}) {
  const modelModified = ref(false);

  const isDirty = computed(() => {
    if (modelModified.value) return true;
    if (definition.default) return model.value !== definition.default;
    return !!model.value;
  });

  watch(model, () => {
    modelModified.value = true;
  });

  return {
    isDirty
  };
}
