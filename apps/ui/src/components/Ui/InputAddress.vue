<script lang="ts">
export default {
  inheritAttrs: false
};
</script>

<script setup lang="ts">
withDefaults(
  defineProps<{
    showPicker?: boolean;
    path?: string;
  }>(),
  {
    showPicker: true
  }
);

const emit = defineEmits<{
  (e: 'pick', path: string);
}>();
</script>

<template>
  <div class="relative">
    <div v-if="showPicker" class="absolute top-3.5 right-3 z-10">
      <button type="button" @click="emit('pick', path || '')">
        <IH-identification />
      </button>
    </div>
    <UiInputString v-bind="$attrs as any" class="!pr-7" />
  </div>
</template>
