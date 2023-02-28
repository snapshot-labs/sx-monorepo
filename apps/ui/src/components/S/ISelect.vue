<script lang="ts">
export default {
  inheritAttrs: false
};
</script>

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
    <select v-model="inputValue" class="s-input">
      <option disabled value="">Please select one</option>
      <option v-for="option in definition.enum" :key="option" :value="option">
        {{ option }}
      </option>
    </select>
  </SBase>
</template>
