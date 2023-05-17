<script setup lang="ts">
const props = defineProps<{
  modelValue?: boolean;
  error?: string;
  definition: any;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean);
}>();

const dirty = ref(false);

const inputValue = computed({
  get() {
    if (props.modelValue === undefined && !dirty.value && props.definition.default !== undefined) {
      return props.definition.default;
    }

    return props.modelValue;
  },
  set(newValue: boolean) {
    dirty.value = true;

    emit('update:modelValue', newValue);
  }
});

watch(
  () => props.modelValue,
  () => {
    dirty.value = true;
  }
);
</script>

<template>
  <SBase :definition="definition" :error="error" :dirty="dirty">
    <input v-model="inputValue" type="checkbox" />
  </SBase>
</template>
