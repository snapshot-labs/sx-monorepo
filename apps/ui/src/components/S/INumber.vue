<script setup lang="ts">
const model = defineModel<string | number>();

const props = defineProps<{
  error?: string;
  definition: any;
}>();

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
  <SBase :definition="definition" :error="error" :dirty="dirty">
    <input
      v-model="inputValue"
      type="number"
      class="s-input"
      v-bind="$attrs"
      :placeholder="definition.examples && definition.examples[0]"
    />
  </SBase>
</template>
