<script setup lang="ts">
const model = defineModel<number>();

defineProps<{
  error?: string;
  definition: any;
}>();

const dirty = ref(false);
const days = ref(0);
const hours = ref(0);
const minutes = ref(0);

watch([days, hours, minutes], () => {
  dirty.value = true;
  model.value = (days.value * 24 * 60 + hours.value * 60 + minutes.value) * 60;
});

watch(
  model,
  value => {
    if (!value) return;

    days.value = Math.floor(value / (24 * 60 * 60));
    hours.value = Math.floor((value % (24 * 60 * 60)) / (60 * 60));
    minutes.value = Math.floor((value % (60 * 60)) / 60);
  },
  { immediate: true }
);
</script>

<template>
  <div>
    <div :class="{ 'text-skin-danger': error && dirty }" v-text="definition.title" />
    <div class="flex !mb-0" :class="{ 's-error': error && dirty }">
      <UiWrapperInput :definition="{ title: 'Days' }" class="flex-1" :dirty="dirty">
        <input v-model="days" class="s-input !rounded-r-none" type="number" min="0" />
      </UiWrapperInput>
      <UiWrapperInput :definition="{ title: 'Hours' }" class="flex-1" :dirty="dirty">
        <input v-model="hours" class="s-input !rounded-none !border-l-0" type="number" min="0" />
      </UiWrapperInput>
      <UiWrapperInput :definition="{ title: 'Minutes' }" class="flex-1" :dirty="dirty">
        <input
          v-model="minutes"
          class="s-input !rounded-l-none !border-l-0"
          type="number"
          min="0"
        />
      </UiWrapperInput>
    </div>
    <div v-if="error && dirty" class="s-base s-error">
      <span class="s-input-error-message">{{ error }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Firefox */
input[type='number'] {
  appearance: textfield;
  -moz-appearance: textfield;
}
</style>
