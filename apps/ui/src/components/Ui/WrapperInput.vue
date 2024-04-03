<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    definition: any;
    inputValueLength?: number;
    error?: string;
    dirty?: boolean;
  }>(),
  { inputValueLength: 0 }
);

const showError = computed(() => props.error && props.dirty);
</script>

<template>
  <div class="s-base" :class="showError ? 's-error' : ''">
    <div class="!flex s-label w-full gap-1">
      <label v-if="definition.title" class="truncate" v-text="definition.title" />
      <div
        v-if="inputValueLength >= 0 && definition.maxLength"
        class="text-sm hidden grow text-right s-label-char-count whitespace-nowrap"
      >
        {{ inputValueLength }} / {{ definition.maxLength }}
      </div>
    </div>
    <slot />
    <span v-if="showError" class="s-input-error-message">{{ error }}</span>
    <legend v-if="definition.description" v-text="definition.description" />
  </div>
</template>

<style lang="scss">
.s-base {
  .s-label:has(+ input:focus),
  &.s-error {
    .s-label-char-count {
      display: block;
    }
  }
}
</style>
