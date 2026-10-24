<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    error: string | null;
    isModified: boolean;
    saving: boolean;
    saveLabel?: string;
    readOnlyMessage?: string;
  }>(),
  {
    saveLabel: 'Save'
  }
);

defineEmits<{
  (e: 'save'): void;
  (e: 'reset'): void;
}>();

const message = computed(
  () =>
    props.readOnlyMessage ||
    props.error ||
    (props.isModified ? 'You have unsaved changes' : null)
);
</script>

<template>
  <UiToolbarBottom>
    <div
      class="px-4 py-3 flex flex-col xs:flex-row items-center"
      :class="message ? 'justify-between' : 'justify-end'"
    >
      <h4
        v-if="message"
        class="leading-7 font-medium truncate mb-2 xs:mb-0"
        :class="{ 'text-skin-danger': error && !readOnlyMessage }"
      >
        {{ message }}
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
          v-if="!error && !readOnlyMessage"
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
