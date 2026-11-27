<script setup lang="ts">
import { Listbox } from '@ui-sdk/vue/listbox';

const props = defineProps<{ modelValue?: string | null }>();

const emit = defineEmits<{ select: [value: string] }>();

// Pressing the chosen option picks it again, like before
function pick(value: string | null) {
  const picked = value ?? props.modelValue;
  if (picked != null) emit('select', picked);
}
</script>

<template>
  <!-- Arrow keys only move focus: a press, Space or Enter picks -->
  <Listbox
    :value="modelValue ?? null"
    activation="manual"
    deselectable
    @value-change="pick"
  >
    <slot />
  </Listbox>
</template>
