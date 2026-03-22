<script setup lang="ts">
const emit = defineEmits<{
  (e: 'sortChange'): void;
}>();

const props = withDefaults(
  defineProps<{
    isOrdered?: boolean;
    orderDirection?: 'asc' | 'desc';
  }>(),
  {
    isOrdered: false,
    orderDirection: undefined
  }
);

const isSortable = computed(() => props.orderDirection !== undefined);
</script>

<template>
  <component
    :is="isSortable ? 'button' : 'span'"
    :type="isSortable ? 'button' : undefined"
    class="flex items-center space-x-1 truncate"
    :class="isSortable ? 'hover:text-skin-link' : ''"
    @click="isSortable && emit('sortChange')"
  >
    <span class="truncate"><slot /></span>
    <template v-if="isSortable && isOrdered">
      <IH-arrow-sm-down v-if="orderDirection === 'desc'" class="shrink-0" />
      <IH-arrow-sm-up v-else-if="orderDirection === 'asc'" class="shrink-0" />
    </template>
  </component>
</template>
