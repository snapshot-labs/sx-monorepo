<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    error: string | null;
    isModified: boolean;
    saving: boolean;
    saveLabel?: string;
  }>(),
  {
    saveLabel: 'Save'
  }
);

defineEmits<{
  (e: 'save'): void;
  (e: 'reset'): void;
}>();

const hasMessage = computed(() => props.error || props.isModified);
</script>

<template>
  <UiToolbarBottom>
    <div
      class="px-4 py-3 flex flex-col xs:flex-row items-center"
      :class="hasMessage ? 'justify-between' : 'justify-end'"
    >
      <h4
        v-if="hasMessage"
        class="leading-7 font-medium truncate mb-2 xs:mb-0"
        :class="{ 'text-skin-danger': error }"
      >
        {{ error || 'You have unsaved changes' }}
      </h4>
      <div class="flex space-x-3">
        <button
          v-if="isModified"
          type="reset"
          class="text-skin-heading"
          @click="$emit('reset')"
        >
          Reset
        </button>
        <UiButton
          v-if="!error"
          :loading="saving"
          primary
          @click="$emit('save')"
        >
          {{ saveLabel }}
        </UiButton>
      </div>
    </div>
  </UiToolbarBottom>
</template>
