<script setup lang="ts">
const emit = defineEmits<{
  (e: 'sortChange'): void;
}>();

defineProps<{
  isOrdered: boolean;
  orderDirection: 'asc' | 'desc';
  label: string;
}>();
</script>

<template>
  <button
    class="flex items-center space-x-1 hover:text-skin-link justify-end truncate"
    @click="emit('sortChange')"
  >
    <span class="truncate" v-text="label" />
    <template v-if="isOrdered">
      <IH-arrow-sm-down v-if="orderDirection === 'desc'" class="shrink-0" />
      <IH-arrow-sm-up v-else-if="orderDirection === 'asc'" class="shrink-0" />
    </template>
  </button>
</template>
