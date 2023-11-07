<script lang="ts">
export default {
  inheritAttrs: false
};
</script>

<script setup lang="ts">
const props = defineProps<{
  modelValue?: string;
  error?: string;
  definition: any;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string);
}>();

const dirty = ref(false);

const inputValue = computed({
  get() {
    if (!props.modelValue && !dirty.value && props.definition.default) {
      return props.definition.default;
    }

    return props.modelValue;
  },
  set(newValue: string) {
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
    <textarea
      v-model="inputValue"
      class="s-input"
      v-bind="$attrs"
      :placeholder="definition.examples && definition.examples[0]"
    />
  </SBase>
</template>
