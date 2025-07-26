import { JSONSchemaType } from 'ajv';
import { computed, ref, Ref, watch } from 'vue';

export interface Definition<T> {
  type?: JSONSchemaType<T>['type'];
  default?: T;
}

const getTypeBasedDefault = (type?: JSONSchemaType<any>['type']) => {
  const types = Array.isArray(type) ? type : [type];

  if (types.includes('string')) {
    return '';
  }

  if (types.includes('number') || types.includes('integer')) {
    return 0;
  }

  if (types.includes('boolean')) {
    return false;
  }

  if (types.includes('array')) {
    return [];
  }

  if (types.includes('object')) {
    return {};
  }

  if (types.includes('null')) {
    return null;
  }

  return undefined;
};

const compareValues = (value1: any, value2: any) => {
  if (
    Array.isArray(value1) ||
    Array.isArray(value2) ||
    (typeof value1 === 'object' && value1 !== null) ||
    (typeof value2 === 'object' && value2 !== null)
  ) {
    return JSON.stringify(value1) !== JSON.stringify(value2);
  }
  return value1 !== value2;
};

export function useDirty<T>(model: Ref<T>, definition: Definition<T> = {}) {
  const modelModified = ref(false);

  const isDirty = computed(() => {
    const effectiveDefault =
      'default' in definition
        ? definition.default
        : getTypeBasedDefault(definition.type);

    if (!modelModified.value) {
      if (effectiveDefault !== undefined) {
        return compareValues(model.value, effectiveDefault);
      }
      return !!model.value;
    }

    if (effectiveDefault !== undefined) {
      return compareValues(model.value, effectiveDefault);
    }

    return true;
  });

  watch(model, () => {
    modelModified.value = true;
  });

  return {
    isDirty
  };
}
