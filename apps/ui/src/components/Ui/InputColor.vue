<script lang="ts">
export default {
  inheritAttrs: false
};
</script>

<script setup lang="ts">
const model = defineModel<string>();

const props = defineProps<{
  loading?: boolean;
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

onMounted(() => {
  if (!model.value) {
    generateRandomColor();
  }
});

function generateRandomColor() {
  model.value = `#${Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, '0')}`.toUpperCase();
}
</script>

<template>
  <UiWrapperInput
    v-slot="{ id }"
    :definition="definition"
    :loading="loading"
    :error="error"
    :dirty="dirty"
    :input-value-length="inputValue?.length"
  >
    <div class="flex">
      <div
        class="absolute size-[18px] mt-[31px] ml-3 rounded"
        :style="{
          backgroundColor: inputValue || '#eb4c5b'
        }"
      />
      <input
        :id="id"
        v-model.trim="inputValue"
        type="text"
        class="s-input !pl-6"
        v-bind="$attrs"
        :placeholder="definition.examples && definition.examples[0]"
      />
      <button class="absolute right-3 mt-[21px]" @click="generateRandomColor">
        <IH-refresh class="text-skin-link" />
      </button>
    </div>
  </UiWrapperInput>
</template>
