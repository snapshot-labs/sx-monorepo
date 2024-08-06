<script lang="ts">
export default {
  inheritAttrs: false
};
</script>

<script setup lang="ts">
const model = defineModel<string>({
  required: true
});

const props = defineProps<{
  error?: string;
  definition: any;
}>();

const dirty = ref(false);

const inputValue = computed(() => {
  if (!model.value && !dirty.value && props.definition.default) {
    return props.definition.default;
  }

  return model.value;
});

function handleInput(event: Event) {
  const inputEvent = event as InputEvent;
  const target = inputEvent.target as HTMLInputElement;
  const value = target.value;

  dirty.value = true;

  if (value === '') {
    model.value = '';
    return;
  }

  if (!/^[0-9]*[.,]?[0-9]*$/.test(value)) {
    target.value = model.value;
    return;
  }

  model.value = value;
}

watch(model, () => {
  dirty.value = true;
});
</script>

<template>
  <UiWrapperInput
    v-slot="{ id }"
    :definition="definition"
    :error="error"
    :dirty="dirty"
    :input-value-length="inputValue?.length"
  >
    <input
      :id="id"
      :value="inputValue"
      type="text"
      class="s-input"
      pattern="^[0-9]*[.,]?[0-9]*$"
      inputmode="decimal"
      v-bind="$attrs"
      :placeholder="definition.examples && definition.examples[0]"
      @input="handleInput"
    />
  </UiWrapperInput>
</template>
