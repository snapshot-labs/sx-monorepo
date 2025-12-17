<script setup lang="ts">
const model = defineModel<string>({
  required: true
});

const props = defineProps<{
  decimals?: number;
}>();

const pattern = computed(() => {
  if (!props.decimals) {
    return /^[0-9]*[.]?[0-9]*$/;
  }

  return new RegExp(`^[0-9]*[.]?[0-9]{0,${props.decimals}}$`);
});

function handleInput(event: Event) {
  if (event instanceof InputEvent === false) return;

  const target = event.target;
  if (target instanceof HTMLInputElement === false) return;

  const value = target.value;

  if (value === '') {
    model.value = '';
    return;
  }

  if (!pattern.value.test(value)) {
    target.value = model.value;
    return;
  }

  model.value = value;
}
</script>

<template>
  <input :value="model" type="text" inputmode="decimal" @input="handleInput" />
</template>
