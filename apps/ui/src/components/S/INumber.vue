<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  modelValue: [Number, String],
  definition: Object
});

const emit = defineEmits(['update:modelValue']);

const dirty = ref(false);

const inputValue = computed({
  get() {
    if (!props.value && !dirty.value && props.definition.default) {
      return props.definition.default;
    }

    return props.modelValue;
  },
  set(newValue) {
    dirty.value = true;

    emit('update:modelValue', newValue);
  }
});
</script>

<template>
  <SBase :definition="definition">
    <input
      type="number"
      v-model="inputValue"
      class="s-input"
      :placeholder="definition.examples && definition.examples[0]"
    />
  </SBase>
</template>
