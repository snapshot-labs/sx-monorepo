<script setup lang="ts">
const props = defineProps<{
  definition: any;
  error?: string;
  dirty?: boolean;
}>();

const showError = computed(() => props.error && props.dirty);
</script>

<template>
  <div class="s-base" :class="showError ? 's-error' : ''">
    <label v-if="definition.title" class="s-label" v-text="definition.title" />
    <slot />
    <div v-if="showError" class="s-input-error-message">{{ error }}</div>
    <legend v-if="definition.description" v-text="definition.description" />
  </div>
</template>
