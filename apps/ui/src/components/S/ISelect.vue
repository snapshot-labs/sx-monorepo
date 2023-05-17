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
    <select v-model="inputValue" class="s-input">
      <option disabled value="">Please select one</option>
      <option
        v-for="option in definition.options || definition.enum"
        :key="option.id === undefined ? option : option.id"
        :value="option.id === undefined ? option : option.id"
      >
        {{ option.name ?? option }}
      </option>
    </select>
  </SBase>
</template>
