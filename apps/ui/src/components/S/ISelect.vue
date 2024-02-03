<script lang="ts">
export default {
  inheritAttrs: false
};
</script>

<script setup lang="ts">
const model = defineModel<string>();

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
