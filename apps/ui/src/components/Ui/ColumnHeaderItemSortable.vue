<script setup lang="ts">
const emit = defineEmits<{
  (e: 'sortChange'): void;
}>();

defineProps<{
  isOrdered: boolean;
  orderDirection: 'asc' | 'desc';
}>();
</script>

<template>
  <button
    v-bind="$attrs"
    class="flex items-center space-x-1 hover:text-skin-link uppercase truncate"
    @click="emit('sortChange')"
  >
    <span><slot /></span>
    <template v-if="isOrdered">
      <IH-arrow-sm-down v-if="orderDirection === 'desc'" class="shrink-0" />
      <IH-arrow-sm-up v-else-if="orderDirection === 'asc'" class="shrink-0" />
    </template>
  </button>
</template>
