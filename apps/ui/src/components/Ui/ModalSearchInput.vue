<script setup lang="ts">
const modelValue = defineModel<string>({ required: true });

withDefaults(
  defineProps<{
    placeholder?: string;
  }>(),
  {
    placeholder: 'Search'
  }
);

const searchInput = ref<HTMLInputElement | null>(null);

defineExpose({
  searchInput
});
</script>

<template>
  <div class="flex items-center border-t px-2 py-3 mt-3 -mb-3">
    <IH-search class="mx-2" />
    <input
      ref="searchInput"
      v-model="modelValue"
      type="text"
      :placeholder="placeholder"
      class="flex-auto bg-transparent text-skin-link"
    />
  </div>
</template>
