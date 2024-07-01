<script setup lang="ts">
const model = defineModel<string | number>();

const props = withDefaults(
  defineProps<{
    error?: string;
    definition: any;
    disabled?: boolean;
  }>(),
  { disabled: false }
);

const dirty = ref(false);

const inputValue = computed({
  get() {
    if (!model.value && !dirty.value && props.definition.default) {
      return props.definition.default;
    }

    return model.value;
  },
  set(newValue: string) {
    dirty.value = true;
    model.value = newValue;
  }
});

watch(model, () => {
  dirty.value = true;
});
</script>

<template>
  <UiWrapperInput v-slot="{ id }" :definition="definition" :error="error" :dirty="dirty">
    <input
      :id="id"
      v-model="inputValue"
      type="number"
      class="s-input"
      :disabled="disabled"
      :class="{ '!text-skin-text': disabled }"
      v-bind="$attrs"
      :placeholder="definition.examples && definition.examples[0]"
    />
  </UiWrapperInput>
</template>
