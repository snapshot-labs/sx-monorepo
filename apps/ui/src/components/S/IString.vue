<script setup lang="ts">
import { ref, computed } from 'vue';

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
</script>

<template>
  <SBase :definition="definition" :error="error" :dirty="dirty">
    <input
      v-model="inputValue"
      type="text"
      class="s-input"
      :placeholder="definition.examples && definition.examples[0]"
    />
  </SBase>
</template>
