<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  value: [Number, String],
  definition: Object
});

const emit = defineEmits(['input']);

const dirty = ref(false);

const inputValue = computed({
  get() {
    if (!props.value && !dirty.value && props.definition.default) {
      return props.definition.default;
    }

    return props.value;
  },
  set(newValue) {
    dirty.value = true;

    emit('input', newValue);
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
